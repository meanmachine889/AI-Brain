"""Audit trail for reads of clients' (third-party) data.

`record()` writes one append-only AuditLog row on a fresh OWNER session — a separate
transaction from the request, on the RLS-bypassing role — so the entry is captured
even if the request later errors/rolls back, and can't be scoped away by RLS. It's
best-effort: a logging failure must never break the actual read, so we swallow and
log exceptions rather than propagate them.
"""
import logging

from db.models import AuditLog, Member
from db.session import async_session

logger = logging.getLogger(__name__)

# action vocabulary (keep in sync with the Activity UI)
VIEW_CLIENT = "view_client"
ASK_CLIENT = "ask_client"
VIEW_SUMMARY = "view_summary"
VIEW_DASHBOARD = "view_dashboard"


async def record(
    actor: Member,
    action: str,
    *,
    client_id: str | None = None,
    client_name: str | None = None,
    metadata: dict | None = None,
) -> None:
    try:
        async with async_session() as db:
            db.add(
                AuditLog(
                    agency_id=actor.agency_id,
                    actor_member_id=actor.id,
                    actor_email=actor.email,
                    action=action,
                    client_id=client_id,
                    client_name=client_name,
                    metadata_=metadata or {},
                )
            )
            await db.commit()
    except Exception:  # never let auditing break a real read
        logger.exception("audit log write failed (action=%s client=%s)", action, client_id)
