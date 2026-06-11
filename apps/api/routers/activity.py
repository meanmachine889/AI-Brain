"""Activity / audit-trail endpoint (owner-only).

Surfaces the append-only AuditLog: who (member/email) accessed which client, when,
and what they did. RLS already scopes rows to the owner's agency; require_owner
gates the route (members can't read the trail).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import require_owner
from db.session import get_db
from db.models import AuditLog, Member

router = APIRouter()


@router.get("/activity")
async def list_activity(
    client_id: str | None = Query(None),
    actor_member_id: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).where(AuditLog.agency_id == owner.agency_id)
    if client_id:
        stmt = stmt.where(AuditLog.client_id == client_id)
    if actor_member_id:
        stmt = stmt.where(AuditLog.actor_member_id == actor_member_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)

    rows = (
        await db.execute(
            stmt.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
        )
    ).scalars().all()

    return [
        {
            "id": r.id,
            "actor_member_id": r.actor_member_id,
            "actor_email": r.actor_email,
            "action": r.action,
            "client_id": r.client_id,
            "client_name": r.client_name,
            "metadata": r.metadata_,
            "created_at": r.created_at,
        }
        for r in rows
    ]
