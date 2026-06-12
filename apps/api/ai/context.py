"""Render DataChunks into the context lines the model reads.

One formatter for every prompt (summary + ask) so the model always sees the
same shape: source, WHEN it happened (with weekday — required to resolve
relative phrases like "next Friday" written inside the content), and the
metadata that isn't visible in `content` alone (status, assignee, due date,
sender, channel).
"""

from datetime import date

from db.models import DataChunk
from ai.temporal import annotate_relative_dates


def _with_weekday(iso_date: str) -> str:
    """'2026-05-30' -> 'Sat 2026-05-30'; pass through anything unparsable.
    Bare dates invite the model to guess the weekday (wrongly)."""
    try:
        return date.fromisoformat(iso_date[:10]).strftime("%a ") + iso_date
    except ValueError:
        return iso_date


def format_chunk(row: DataChunk) -> str:
    md = row.metadata_ or {}
    when = (
        row.source_timestamp.strftime("%a %Y-%m-%d %H:%M")
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
            extra.append(f"due: {_with_weekday(md['due_date'])}")
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
    # Resolve "next Friday" / "tomorrow" / "EOD" etc. against the item's own
    # timestamp in code — deterministic, so every prompt sees the same date.
    content = annotate_relative_dates(row.content, row.source_timestamp)
    return f"[{row.source} · {when}{meta}] {content}"
