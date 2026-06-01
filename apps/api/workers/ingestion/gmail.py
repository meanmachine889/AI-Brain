import asyncio
import base64
import re
from datetime import datetime, timedelta

import httpx
from sqlalchemy import select

from ai.embeddings import embed_batch
from core.config import settings
from db.models import Client, DataChunk, Integration
from db.session import async_session
from workers.celery_app import celery_app

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


# ---- helpers ----
def _b64url_decode(data: str) -> str:
    if not data:
        return ""
    padded = data + "=" * (-len(data) % 4)
    try:
        return base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _strip_html(html: str) -> str:
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;|&amp;|&lt;|&gt;|&#39;|&quot;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_body(payload: dict) -> str:
    """Walk the MIME tree; prefer text/plain, fall back to stripped text/html."""
    mime = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data")

    if mime == "text/plain" and body_data:
        return _b64url_decode(body_data)
    if mime == "text/html" and body_data:
        return _strip_html(_b64url_decode(body_data))

    # multipart: recurse, preferring plain
    parts = payload.get("parts", []) or []
    plain = ""
    html = ""
    for p in parts:
        sub = _extract_body(p)
        if p.get("mimeType") == "text/plain" and sub:
            plain = plain or sub
        elif sub:
            html = html or sub
    return plain or html


def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _build_query(client: Client, after: datetime) -> str | None:
    """Gmail search: messages from/to the client's domain or contact emails."""
    targets = []
    if client.domain:
        targets.append(client.domain)
    targets.extend(client.contact_emails or [])
    if not targets:
        return None
    or_clause = " OR ".join(f"from:{t} OR to:{t}" for t in targets)
    return f"({or_clause}) after:{after.strftime('%Y/%m/%d')}"


async def _embed_all(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    results = await asyncio.gather(*(embed_batch(b) for b in batches))
    return [vec for batch in results for vec in batch]


async def _ensure_token(db, integration: Integration, http: httpx.AsyncClient) -> str:
    now = datetime.utcnow()
    if integration.expires_at and integration.expires_at > now + timedelta(seconds=60):
        return integration.access_token
    resp = await http.post(
        GOOGLE_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": integration.refresh_token,
        },
    )
    resp.raise_for_status()
    tok = resp.json()
    integration.access_token = tok["access_token"]
    # Google does not return a new refresh_token on refresh — keep the existing one
    integration.expires_at = now + timedelta(seconds=tok.get("expires_in", 3600))
    await db.commit()
    return integration.access_token


# ---- tasks ----
@celery_app.task(name="workers.ingestion.gmail.ingest_for_agency")
def ingest_for_agency(agency_id: str):
    asyncio.run(_ingest_for_agency_async(agency_id))


async def _ingest_for_agency_async(agency_id: str):
    async with async_session() as db:
        integration = (
            await db.execute(
                select(Integration).where(
                    Integration.agency_id == agency_id,
                    Integration.provider == "gmail",
                )
            )
        ).scalar_one_or_none()
        if not integration:
            print(f"[gmail] no integration for agency {agency_id}")
            return

        clients = (
            await db.execute(select(Client).where(Client.agency_id == agency_id))
        ).scalars().all()

        async with httpx.AsyncClient(timeout=30) as http:
            token = await _ensure_token(db, integration, http)
            headers = {"Authorization": f"Bearer {token}"}
            after = datetime.utcnow() - timedelta(days=7)

            for client in clients:
                query = _build_query(client, after)
                if not query:
                    continue  # no domain/contacts -> nothing to match on

                try:
                    listing = await http.get(
                        f"{GMAIL_API}/messages",
                        params={"q": query, "maxResults": 50},
                        headers=headers,
                    )
                    listing.raise_for_status()
                except Exception as e:
                    print(f"[gmail] list failed for client {client.name}: {e}")
                    continue

                msg_ids = [m["id"] for m in listing.json().get("messages", [])]
                if not msg_ids:
                    continue

                # dedupe against already-stored gmail message ids for this client
                existing_ids = set(
                    (
                        await db.execute(
                            select(DataChunk.source_id).where(
                                DataChunk.client_id == client.id,
                                DataChunk.source == "gmail",
                            )
                        )
                    ).scalars().all()
                )
                new_ids = [mid for mid in msg_ids if mid not in existing_ids]
                if not new_ids:
                    continue

                records = []  # (id, content, metadata, ts)
                for mid in new_ids:
                    try:
                        msg = (
                            await http.get(
                                f"{GMAIL_API}/messages/{mid}",
                                params={"format": "full"},
                                headers=headers,
                            )
                        ).json()
                    except Exception:
                        continue
                    payload = msg.get("payload", {})
                    hdrs = payload.get("headers", [])
                    subject = _header(hdrs, "Subject")
                    sender = _header(hdrs, "From")
                    to = _header(hdrs, "To")
                    body = _extract_body(payload)[:4000]
                    ts = datetime.utcfromtimestamp(int(msg.get("internalDate", "0")) / 1000)

                    content = f"From: {sender}\nTo: {to}\nSubject: {subject}\n\n{body}"
                    records.append((
                        mid,
                        content,
                        {"from": sender, "to": to, "subject": subject,
                         "thread_id": msg.get("threadId")},
                        ts,
                    ))

                if not records:
                    continue

                embeddings = await _embed_all([r[1] for r in records])
                for (mid, content, meta, ts), emb in zip(records, embeddings):
                    db.add(DataChunk(
                        client_id=client.id,
                        source="gmail",
                        source_id=mid,
                        content=content,
                        embedding=emb,
                        metadata_=meta,
                        source_timestamp=ts,
                    ))
                await db.commit()
                print(f"[gmail] stored {len(records)} emails for client={client.name}")

        from workers.summarizer import summarize_client
        for client in clients:
            summarize_client.delay(client.id)


@celery_app.task(name="workers.ingestion.gmail.ingest_all_agencies")
def ingest_all_agencies():
    asyncio.run(_ingest_all_async())


async def _ingest_all_async():
    async with async_session() as db:
        integrations = (
            await db.execute(select(Integration).where(Integration.provider == "gmail"))
        ).scalars().all()
    for integ in integrations:
        ingest_for_agency.delay(integ.agency_id)
