import asyncio
import re
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select

from ai.embeddings import embed_batch
from core.config import settings
from db.models import Client, DataChunk, Integration
from db.session import async_session
from workers.celery_app import celery_app

JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"


# ---- helpers ----
def _adf_to_text(node) -> str:
    """Flatten Atlassian Document Format (rich-text JSON) into plain text."""
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "".join(_adf_to_text(n) for n in node)
    parts = []
    if node.get("type") == "text" and "text" in node:
        parts.append(node["text"])
    parts.append("".join(_adf_to_text(c) for c in node.get("content", []) or []))
    if node.get("type") in ("paragraph", "heading", "listItem", "blockquote"):
        parts.append("\n")
    return "".join(parts)


def _parse_jira_dt(s: str) -> datetime:
    """Jira returns e.g. '2026-05-31T10:00:00.000+0530' -> naive UTC datetime."""
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        dt = datetime.fromisoformat(re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", s))
    if dt.tzinfo:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


async def _embed_all(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    results = await asyncio.gather(*(embed_batch(b) for b in batches))
    return [vec for batch in results for vec in batch]


async def _ensure_token(db, integration: Integration, http: httpx.AsyncClient) -> str:
    """Return a valid access token, refreshing if it's expired/about to expire."""
    now = datetime.utcnow()
    if integration.expires_at and integration.expires_at > now + timedelta(seconds=60):
        return integration.access_token

    resp = await http.post(
        JIRA_TOKEN_URL,
        json={
            "grant_type": "refresh_token",
            "client_id": settings.jira_client_id,
            "client_secret": settings.jira_client_secret,
            "refresh_token": integration.refresh_token,
        },
    )
    resp.raise_for_status()
    tok = resp.json()
    integration.access_token = tok["access_token"]
    if tok.get("refresh_token"):  # Atlassian rotates refresh tokens
        integration.refresh_token = tok["refresh_token"]
    integration.expires_at = now + timedelta(seconds=tok.get("expires_in", 3600))
    await db.commit()
    return integration.access_token


# ---- tasks ----
@celery_app.task(name="workers.ingestion.jira.ingest_for_agency")
def ingest_for_agency(agency_id: str):
    asyncio.run(_ingest_for_agency_async(agency_id))


async def _ingest_for_agency_async(agency_id: str):
    async with async_session() as db:
        integration = (
            await db.execute(
                select(Integration).where(
                    Integration.agency_id == agency_id,
                    Integration.provider == "jira",
                )
            )
        ).scalar_one_or_none()
        if not integration:
            print(f"[jira] no integration for agency {agency_id}")
            return

        clients = (
            await db.execute(select(Client).where(Client.agency_id == agency_id))
        ).scalars().all()

        async with httpx.AsyncClient(timeout=30) as http:
            token = await _ensure_token(db, integration, http)
            base = f"https://api.atlassian.com/ex/jira/{integration.workspace_id}/rest/api/3"
            headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

            for client in clients:
                for key in client.jira_project_keys:
                    jql = f'project = "{key}" AND updated >= -7d ORDER BY updated DESC'
                    try:
                        resp = await http.get(
                            f"{base}/search/jql",
                            params={
                                "jql": jql,
                                "fields": "summary,description,status,assignee,priority,duedate,comment,updated",
                                "maxResults": 50,
                            },
                            headers=headers,
                        )
                        resp.raise_for_status()
                    except Exception as e:
                        print(f"[jira] search failed for project {key}: {e}")
                        continue

                    issues = resp.json().get("issues", [])
                    if not issues:
                        continue

                    records = []  # (key, content, metadata, ts)
                    for issue in issues:
                        f = issue.get("fields", {})
                        ikey = issue["key"]
                        summary = f.get("summary") or ""
                        description = _adf_to_text(f.get("description")).strip()
                        status = (f.get("status") or {}).get("name")
                        assignee = (f.get("assignee") or {}).get("displayName")
                        priority = (f.get("priority") or {}).get("name")
                        due = f.get("duedate")
                        comments = (f.get("comment") or {}).get("comments", [])
                        comment_texts = [
                            _adf_to_text(c.get("body")).strip() for c in comments
                        ]

                        content = f"[{ikey}] {summary}\nStatus: {status}"
                        if description:
                            content += f"\n{description}"
                        if comment_texts:
                            content += "\nComments:\n" + "\n".join(
                                f"- {t}" for t in comment_texts if t
                            )

                        records.append((
                            ikey,
                            content,
                            {
                                "ticket_key": ikey,
                                "status": status,
                                "assignee": assignee,
                                "priority": priority,
                                "due_date": due,
                            },
                            _parse_jira_dt(f["updated"]),
                        ))

                    embeddings = await _embed_all([r[1] for r in records])

                    for (ikey, content, meta, ts), emb in zip(records, embeddings):
                        # upsert: Jira tickets change, so update if we've seen this key
                        existing = (
                            await db.execute(
                                select(DataChunk).where(
                                    DataChunk.client_id == client.id,
                                    DataChunk.source == "jira",
                                    DataChunk.source_id == ikey,
                                )
                            )
                        ).scalar_one_or_none()
                        if existing:
                            existing.content = content
                            existing.embedding = emb
                            existing.metadata_ = meta
                            existing.source_timestamp = ts
                        else:
                            db.add(DataChunk(
                                client_id=client.id,
                                source="jira",
                                source_id=ikey,
                                content=content,
                                embedding=emb,
                                metadata_=meta,
                                source_timestamp=ts,
                            ))
                    await db.commit()
                    print(f"[jira] upserted {len(records)} issues for "
                          f"client={client.name} project={key}")

        from workers.summarizer import summarize_client
        for client in clients:
            summarize_client.delay(client.id)


@celery_app.task(name="workers.ingestion.jira.ingest_all_agencies")
def ingest_all_agencies():
    asyncio.run(_ingest_all_async())


async def _ingest_all_async():
    async with async_session() as db:
        integrations = (
            await db.execute(select(Integration).where(Integration.provider == "jira"))
        ).scalars().all()
    for integ in integrations:
        ingest_for_agency.delay(integ.agency_id)
