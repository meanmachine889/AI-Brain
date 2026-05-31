import asyncio
from datetime import datetime, timedelta, timezone

from slack_sdk.web.async_client import AsyncWebClient
from sqlalchemy import select

from ai.embeddings import embed_batch
from db.models import Client, DataChunk, Integration
from db.session import async_session
from workers.celery_app import celery_app


def _ts_to_naive_utc(ts: str) -> datetime:
    return datetime.fromtimestamp(float(ts), tz=timezone.utc).replace(tzinfo=None)


async def _embed_all(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    """Embed all texts, firing the sub-batches concurrently for throughput.
    batch_size caps texts per request (a hard API limit, not rate-limiting)."""
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    results = await asyncio.gather(*(embed_batch(b) for b in batches))
    return [vec for batch in results for vec in batch]



@celery_app.task(name="workers.ingestion.slack.ingest_for_agency")
def ingest_for_agency(agency_id: str):
    asyncio.run(_ingest_for_agency_async(agency_id))


async def _ingest_for_agency_async(agency_id: str):
    async with async_session() as db:
        integration = (
            await db.execute(
                select(Integration).where(
                    Integration.agency_id == agency_id,
                    Integration.provider == "slack",
                )
            )
        ).scalar_one_or_none()
        if not integration:
            print(f"[slack] no integration for agency {agency_id}")
            return

        clients = (
            await db.execute(select(Client).where(Client.agency_id == agency_id))
        ).scalars().all()

        slack = AsyncWebClient(token=integration.access_token)
        oldest = (datetime.now(timezone.utc) - timedelta(days=7)).timestamp()
        user_cache: dict[str, str] = {}

        async def user_name(uid: str) -> str:
            if not uid:
                return "unknown"
            if uid in user_cache:
                return user_cache[uid]
            try:
                info = await slack.users_info(user=uid)
                name = info["user"].get("real_name") or info["user"].get("name") or uid
            except Exception:
                name = uid
            user_cache[uid] = name
            return name

        for client in clients:
            for channel_id in client.slack_channel_ids:
                try:
                    history = await slack.conversations_history(
                        channel=channel_id, oldest=str(oldest), limit=200
                    )
                except Exception as e:
                    print(f"[slack] cannot read channel {channel_id}: {e}")
                    continue

                # keep real human messages with text
                messages = [
                    m for m in history.get("messages", [])
                    if m.get("type") == "message" and m.get("text") and not m.get("subtype")
                ]
                if not messages:
                    continue

                # dedupe against already-stored ts for this client
                existing_ids = set(
                    (
                        await db.execute(
                            select(DataChunk.source_id).where(
                                DataChunk.client_id == client.id,
                                DataChunk.source == "slack",
                            )
                        )
                    ).scalars().all()
                )
                new_messages = [m for m in messages if m["ts"] not in existing_ids]
                if not new_messages:
                    continue

                texts = [
                    f"[{await user_name(m.get('user', ''))}]: {m['text']}"
                    for m in new_messages
                ]
                embeddings = await _embed_all(texts)

                for m, text, emb in zip(new_messages, texts, embeddings):
                    db.add(DataChunk(
                        client_id=client.id,
                        source="slack",
                        source_id=m["ts"],
                        content=text,
                        embedding=emb,
                        metadata_={
                            "channel_id": channel_id,
                            "user_id": m.get("user"),
                            "user_name": await user_name(m.get("user", "")),
                            "thread_ts": m.get("thread_ts"),
                        },
                        source_timestamp=_ts_to_naive_utc(m["ts"]),
                    ))
                await db.commit()
                print(f"[slack] stored {len(new_messages)} chunks for "
                      f"client={client.name} channel={channel_id}")

        from workers.summarizer import summarize_client
        for client in clients:
            summarize_client.delay(client.id)


@celery_app.task(name="workers.ingestion.slack.ingest_all_agencies")
def ingest_all_agencies():
    asyncio.run(_ingest_all_async())


async def _ingest_all_async():
    async with async_session() as db:
        integrations = (
            await db.execute(select(Integration).where(Integration.provider == "slack"))
        ).scalars().all()
    for integ in integrations:
        ingest_for_agency.delay(integ.agency_id)