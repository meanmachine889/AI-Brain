import re
from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DataChunk
from ai.embeddings import embed_text
from ai.llm import answer
from ai.ranking import POOL_LIMIT, select_indices
from ai.timeframe import parse_timeframe

# For time-scoped questions we return everything in the window (chronological),
# not a semantic top-k — so "what did we discuss last week" is complete. Capped
# to keep the prompt bounded; newest items win if a window is very busy.
WINDOW_LIMIT = 50

# Questions about deadlines concern the Jira `due_date` field, not WHEN an item
# was created/updated — so a phrase like "due this week" must NOT be treated as
# a source_timestamp window. Those are answered semantically (the model reads
# due dates from metadata).
_DUE_RE = re.compile(r"\b(due|deadline|overdue|expir|by when)\b")


def _format_chunk(row: DataChunk) -> str:
    """Render a chunk for the model, folding in the metadata it can't see
    from `content` alone: WHEN it happened (so it can answer "when did X say
    this" / "what date"), plus assignee, due date, sender, etc."""
    md = row.metadata_ or {}
    when = (
        row.source_timestamp.strftime("%Y-%m-%d %H:%M")
        if row.source_timestamp
        else "unknown time"
    )
    # Jira's timestamp is the ticket's last-updated time, not its creation —
    # label it so the model doesn't report tickets as "created" on that date.
    if row.source == "jira" and row.source_timestamp:
        when = f"updated {when}"
    extra: list[str] = []
    if row.source == "jira":
        extra.append(f"status: {md.get('status') or 'unknown'}")
        extra.append(f"assignee: {md.get('assignee') or 'unassigned'}")
        if md.get("due_date"):
            extra.append(f"due: {md['due_date']}")
        if md.get("priority"):
            extra.append(f"priority: {md['priority']}")
    elif row.source == "gmail":
        if md.get("from"):
            extra.append(f"from: {md['from']}")
        if md.get("subject"):
            extra.append(f"subject: {md['subject']}")
    elif row.source == "slack":
        if md.get("channel_name") or md.get("channel_id"):
            extra.append(f"channel: {md.get('channel_name') or md['channel_id']}")
        if md.get("user_name"):
            extra.append(f"author: {md['user_name']}")
    meta = f" ({', '.join(extra)})" if extra else ""
    return f"[{row.source} · {when}{meta}] {row.content}"


async def ask(db: AsyncSession, client_id: str, client_name: str, question: str) -> dict:
    # Does the question name a time window ("last week", "in March", "3 days
    # ago")? If so — and it's not a due-date question — retrieve by time instead
    # of similarity, so the answer is complete for that period.
    tf = parse_timeframe(question, datetime.now())
    windowed = tf is not None and not _DUE_RE.search(question.lower())
    note = ""

    if windowed:
        assert tf is not None  # narrowing: `windowed` implies a parsed window
        # 2a. time-filtered, chronological (newest first), capped.
        rows = (
            await db.execute(
                select(DataChunk)
                .where(
                    and_(
                        DataChunk.client_id == client_id,
                        DataChunk.source_timestamp >= tf.start,
                        DataChunk.source_timestamp <= tf.end,
                    )
                )
                .order_by(DataChunk.source_timestamp.desc())
                .limit(WINDOW_LIMIT)
            )
        ).scalars().all()

        if not rows:
            # Be precise rather than letting the model guess about an empty period.
            return {
                "answer": f"No activity for {client_name} during {tf.label}.",
                "sources": [],
            }
        note = (
            f"The user asked about {tf.label}. The items below are exactly this "
            f"client's activity from {tf.start:%Y-%m-%d} to {tf.end:%Y-%m-%d} "
            f"(newest first) — answer only from this window."
        )
    else:
        # 2b. Hybrid retrieval. Pull a bounded candidate pool from the vector
        #     index (cosine_distance == pgvector's <=> operator, HNSW-accelerated),
        #     then re-rank by similarity × recency with per-source caps so a
        #     chatty source can't evict high-signal items (e.g. open tickets).
        #     Cost stays flat as a client's history grows.
        q_vec = await embed_text(question)
        distance = DataChunk.embedding.cosine_distance(q_vec)
        pool = (
            await db.execute(
                select(DataChunk, distance.label("distance"))
                .where(DataChunk.client_id == client_id)
                .order_by(distance)
                .limit(POOL_LIMIT)
            )
        ).all()

        if not pool:
            return {"answer": "No data available for this client yet.", "sources": []}

        items = [(r[0].source, r[0].source_timestamp, r[1]) for r in pool]
        rows = [pool[i][0] for i in select_indices(items, datetime.now())]

    # 3. build context (with the metadata the model needs), ask Gemini
    chunks = [_format_chunk(r) for r in rows]
    ans = await answer(client_name, question, chunks, timeframe_note=note)

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
