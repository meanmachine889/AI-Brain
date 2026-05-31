import asyncio

from sqlalchemy import select, desc

from db.session import async_session
from db.models import Client, DataChunk, Summary
from ai.llm import summarize
from workers.celery_app import celery_app


@celery_app.task(name="workers.summarizer.summarize_client")
def summarize_client(client_id: str):
    asyncio.run(_summarize_async(client_id))


async def _summarize_async(client_id: str):
    async with async_session() as db:
        client = (
            await db.execute(select(Client).where(Client.id == client_id))
        ).scalar_one_or_none()
        if not client:
            return

        chunks = (
            await db.execute(
                select(DataChunk)
                .where(DataChunk.client_id == client_id)
                .order_by(desc(DataChunk.source_timestamp))
                .limit(30)
            )
        ).scalars().all()
        if not chunks:
            print(f"[summarizer] no chunks for client={client.name}, skipping")
            return

        formatted = [
            f"[{c.source} | {c.source_timestamp.strftime('%Y-%m-%d %H:%M')}] {c.content}"
            for c in chunks
        ]
        summary_text = await summarize(client.name, formatted)

        db.add(Summary(client_id=client_id, content=summary_text, chunk_count=len(chunks)))
        await db.commit()
        print(f"[summarizer] wrote summary for client={client.name} ({len(chunks)} chunks)")