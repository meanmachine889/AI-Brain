from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DataChunk
from ai.embeddings import embed_text
from ai.llm import answer


async def ask(db: AsyncSession, client_id: str, client_name: str, question: str) -> dict:
    # 1. embed the question (embed_text defaults to RETRIEVAL_QUERY task type)
    q_vec = await embed_text(question)

    # 2. vector similarity search, scoped to THIS client.
    #    cosine_distance == pgvector's <=> operator, matches the HNSW
    #    vector_cosine_ops index, so this is index-accelerated.
    rows = (
        await db.execute(
            select(DataChunk)
            .where(DataChunk.client_id == client_id)
            .order_by(DataChunk.embedding.cosine_distance(q_vec))
            .limit(5)
        )
    ).scalars().all()

    if not rows:
        return {"answer": "No data available for this client yet.", "sources": []}

    # 3. build context from the top-5 chunks, ask Gemini
    chunks = [f"[{r.source}] {r.content}" for r in rows]
    ans = await answer(client_name, question, chunks)

    # 4. return the answer + the sources it was grounded on
    return {
        "answer": ans,
        "sources": [
            {
                "source": r.source,
                "content_preview": r.content[:200],
                "source_timestamp": r.source_timestamp,
                "metadata": r.metadata_,
            }
            for r in rows
        ],
    }
