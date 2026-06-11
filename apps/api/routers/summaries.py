from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_agency, get_current_member
from core import audit
from db.session import get_db
from db.models import Agency, Client, Summary, DataChunk, Alert, Member
from pydantic import BaseModel
from ai.rag import ask as rag_ask


router = APIRouter()

STALE_AFTER = timedelta(hours=2)

class AskRequest(BaseModel):
    question: str



# ---- small read helpers ----
async def _latest_summary(db: AsyncSession, client_id: str) -> Summary | None:
    return (
        await db.execute(
            select(Summary)
            .where(Summary.client_id == client_id)
            .order_by(desc(Summary.generated_at))
            .limit(1)
        )
    ).scalar_one_or_none()


def _attention_score(summary, last_activity, alert_count, now) -> int:
    """0-100, additive, capped. Some rules (outbound silence, stale Jira tickets)
    arrive in later steps; implemented here are the signals we already have."""
    score = 0
    if last_activity is None or (now - last_activity).days >= 7:
        score += 40                                   # no activity in 7+ days
    if summary:
        text = summary.content.lower()
        if "blocked" in text or "waiting" in text:
            score += 20                               # summary flags a blocker
    score += min(alert_count * 10, 30)                # +10 per alert, cap +30
    return min(score, 100)


# ---- routes ----
@router.post("/clients/{client_id}/ask")
async def ask_client(
    client_id: str,
    body: AskRequest,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    client = (
        await db.execute(
            select(Client).where(Client.id == client_id, Client.agency_id == member.agency_id)
        )
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await audit.record(
        member, audit.ASK_CLIENT,
        client_id=client.id, client_name=client.name,
        metadata={"question": body.question[:500]},
    )
    return await rag_ask(db, client_id, client.name, body.question)


@router.get("/clients/{client_id}/summary")
async def get_summary(
    client_id: str,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    client = (
        await db.execute(
            select(Client).where(Client.id == client_id, Client.agency_id == member.agency_id)
        )
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    summary = await _latest_summary(db, client_id)
    now = datetime.utcnow()
    is_stale = summary is None or (now - summary.generated_at) > STALE_AFTER

    refreshing = False
    if is_stale:
        # fire a background refresh, but return the (old or empty) summary immediately
        from workers.summarizer import summarize_client
        summarize_client.delay(client_id)
        refreshing = True

    return {
        "summary": summary.content if summary else None,
        "generated_at": summary.generated_at if summary else None,
        "chunk_count": summary.chunk_count if summary else 0,
        "is_stale": is_stale,
        "refreshing": refreshing,
    }


@router.get("/dashboard")
async def dashboard(
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    await audit.record(member, audit.VIEW_DASHBOARD)

    # Query 1: this agency's clients
    clients = (
        await db.execute(select(Client).where(Client.agency_id == member.agency_id))
    ).scalars().all()
    if not clients:
        return {"clients": [], "total_alerts": 0}

    client_ids = [c.id for c in clients]

    # Query 2: latest summary per client (Postgres DISTINCT ON (client_id),
    # ordered so the newest row per client wins)
    summary_rows = (
        await db.execute(
            select(Summary)
            .where(Summary.client_id.in_(client_ids))
            .order_by(Summary.client_id, desc(Summary.generated_at))
            .distinct(Summary.client_id)
        )
    ).scalars().all()
    summary_by_client = {s.client_id: s for s in summary_rows}

    # Query 3: last activity per client (one GROUP BY, not one query per client)
    activity_by_client = dict(
        (
            await db.execute(
                select(DataChunk.client_id, func.max(DataChunk.source_timestamp))
                .where(DataChunk.client_id.in_(client_ids))
                .group_by(DataChunk.client_id)
            )
        ).all()
    )

    # Query 4: unresolved alert counts per client
    alerts_by_client = dict(
        (
            await db.execute(
                select(Alert.client_id, func.count())
                .where(Alert.client_id.in_(client_ids), Alert.resolved == False)  # noqa: E712
                .group_by(Alert.client_id)
            )
        ).all()
    )

    items = []
    total_alerts = 0
    for client in clients:
        summary = summary_by_client.get(client.id)
        last_activity = activity_by_client.get(client.id)
        alert_count = alerts_by_client.get(client.id, 0)
        total_alerts += alert_count
        items.append({
            "id": client.id,
            "name": client.name,
            "domain": client.domain,
            "summary": summary.content if summary else None,
            "last_activity_at": last_activity,
            "attention_score": _attention_score(summary, last_activity, alert_count, now),
            "alert_count": alert_count,
        })

    items.sort(key=lambda c: c["attention_score"], reverse=True)
    return {"clients": items, "total_alerts": total_alerts}

@router.get("/dashboard/alerts")
async def list_alerts(
    resolved: bool = False,
    severity: str | None = None,
    agency: Agency = Depends(get_current_agency),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Alert, Client.name)
        .join(Client, Client.id == Alert.client_id)
        .where(Client.agency_id == agency.id, Alert.resolved == resolved)
    )
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    rows = (await db.execute(stmt.order_by(desc(Alert.created_at)))).all()
    return [
        {
            "id": a.id,
            "client_id": a.client_id,
            "client_name": name,
            "type": a.type,
            "severity": a.severity,
            "message": a.message,
            "metadata": a.metadata_,
            "created_at": a.created_at,
        }
        for a, name in rows
    ]


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    agency: Agency = Depends(get_current_agency),
    db: AsyncSession = Depends(get_db),
):
    alert = (
        await db.execute(
            select(Alert)
            .join(Client, Client.id == Alert.client_id)
            .where(Alert.id == alert_id, Client.agency_id == agency.id)
        )
    ).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    await db.commit()
    return {"resolved": True}
