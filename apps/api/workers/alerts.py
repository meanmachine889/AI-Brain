import asyncio
from datetime import datetime, timedelta

from sqlalchemy import select, desc, func

from db.session import async_session
from db.models import Client, DataChunk, Summary, Alert
from workers.celery_app import celery_app


@celery_app.task(name="workers.alerts.check_all")
def check_all():
    asyncio.run(_check_all_async())


async def _check_all_async():
    async with async_session() as db:
        clients = (await db.execute(select(Client))).scalars().all()
        for client in clients:
            await _check_client(db, client)
        await db.commit()


async def _check_client(db, client: Client):
    now = datetime.utcnow()

    # rule 1: client silent — no activity in 5+ days
    last_activity = (
        await db.execute(
            select(func.max(DataChunk.source_timestamp)).where(
                DataChunk.client_id == client.id
            )
        )
    ).scalar()
    if last_activity is not None and (now - last_activity).days >= 5:
        await _create_alert(
            db, client.id, "client_silent", "high",
            f"No activity in {(now - last_activity).days} days",
        )

    # rule 2: stale Jira tickets — dormant until Jira ingestion exists (Step 13)
    stale = (
        await db.execute(
            select(DataChunk).where(
                DataChunk.client_id == client.id,
                DataChunk.source == "jira",
                DataChunk.source_timestamp < now - timedelta(hours=48),
            )
        )
    ).scalars().all()
    for t in stale:
        if t.metadata_.get("status") in ("In Progress", "In Review"):
            await _create_alert(
                db, client.id, "ticket_stale", "medium",
                f"Ticket {t.metadata_.get('ticket_key')} has no update in 48h",
                metadata={"ticket_key": t.metadata_.get("ticket_key")},
            )

    # rule 3: blocked language in the latest summary
    latest = (
        await db.execute(
            select(Summary).where(Summary.client_id == client.id)
            .order_by(desc(Summary.generated_at)).limit(1)
        )
    ).scalar_one_or_none()
    if latest:
        text = latest.content.lower()
        if "blocked" in text or "waiting on" in text or "stuck" in text:
            await _create_alert(
                db, client.id, "client_blocked", "high",
                "Latest summary indicates client is blocked or waiting",
            )

    # rule 4: deadline approaching — a Jira ticket due within 48h (or overdue)
    # that isn't done yet. due_date is stored date-only (e.g. "2026-06-06").
    open_tickets = (
        await db.execute(
            select(DataChunk).where(
                DataChunk.client_id == client.id,
                DataChunk.source == "jira",
            )
        )
    ).scalars().all()
    for t in open_tickets:
        md = t.metadata_ or {}
        due_raw = md.get("due_date")
        if not due_raw or md.get("status") in ("Done", "Closed", "Resolved"):
            continue
        try:
            due = datetime.fromisoformat(due_raw)
        except ValueError:
            continue
        delta = due - now
        if delta <= timedelta(hours=48):  # due in the next 2 days, or already overdue
            overdue = delta < timedelta(0)
            await _create_alert(
                db, client.id, "deadline_approaching",
                "high" if overdue else "medium",
                f"Ticket {md.get('ticket_key')} is "
                f"{'overdue' if overdue else 'due'} ({due.date()}) and not done",
                metadata={"ticket_key": md.get("ticket_key"), "due_date": due_raw},
            )


async def _create_alert(db, client_id, type_, severity, message, metadata=None):
    metadata = metadata or {}
    ticket_key = metadata.get("ticket_key")
    # dedupe: skip if a matching unresolved alert was created in the last 24h.
    # Ticket-scoped alerts (ticket_stale, deadline_approaching) match on the
    # specific ticket, so each open ticket gets its own alert.
    existing = (
        await db.execute(
            select(Alert).where(
                Alert.client_id == client_id,
                Alert.type == type_,
                Alert.resolved == False,  # noqa: E712
                Alert.created_at > datetime.utcnow() - timedelta(hours=24),
            )
        )
    ).scalars().all()
    for a in existing:
        if ticket_key is None or (a.metadata_ or {}).get("ticket_key") == ticket_key:
            return
    db.add(Alert(
        client_id=client_id, type=type_, severity=severity,
        message=message, metadata_=metadata or {},
    ))
    print(f"[alerts] created {type_} ({severity}) for client {client_id}")
