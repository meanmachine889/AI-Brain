from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import require_owner, new_invite_secret, hash_invite_token
from db.session import get_db
from db.models import Member, Client, ClientMember, ClientInvite

router = APIRouter()

ROLES = {"admin", "viewer"}


class InviteRequest(BaseModel):
    email: str
    role: str = "viewer"
    tag: str | None = None
    expires_in_hours: int = 168  # 7 days
    max_uses: int = 1


class RoleUpdate(BaseModel):
    role: str


async def _owned_client(db: AsyncSession, client_id: str, owner: Member) -> Client:
    """Owner-only: the client must belong to the owner's agency."""
    client = (
        await db.execute(
            select(Client).where(Client.id == client_id, Client.agency_id == owner.agency_id)
        )
    ).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


# ---- invites ----
@router.post("/clients/{client_id}/invites")
async def create_invite(
    client_id: str,
    body: InviteRequest,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="role must be admin or viewer")
    client = await _owned_client(db, client_id, owner)

    secret = new_invite_secret()  # raw secret returned ONCE, only its hash is stored
    invite = ClientInvite(
        client_id=client.id,
        email=body.email.strip().lower(),
        role=body.role,
        tag=(body.tag.strip() if body.tag else None),
        token_hash=hash_invite_token(secret),
        expires_at=datetime.utcnow() + timedelta(hours=max(1, body.expires_in_hours)),
        max_uses=max(1, body.max_uses),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return {
        "id": invite.id,
        "invite_url": f"{settings.frontend_url}/accept-invite?token={secret}",
        "email": invite.email,
        "role": invite.role,
        "tag": invite.tag,
        "expires_at": invite.expires_at,
    }


@router.get("/clients/{client_id}/invites")
async def list_invites(
    client_id: str,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    client = await _owned_client(db, client_id, owner)
    rows = (
        await db.execute(
            select(ClientInvite)
            .where(ClientInvite.client_id == client.id, ClientInvite.revoked.is_(False))
            .order_by(ClientInvite.created_at.desc())
        )
    ).scalars().all()
    now = datetime.utcnow()
    return [
        {
            "id": i.id,
            "email": i.email,
            "role": i.role,
            "tag": i.tag,
            "expires_at": i.expires_at,
            "used": i.uses >= i.max_uses,
            "expired": i.expires_at <= now,
        }
        for i in rows
    ]


@router.delete("/clients/{client_id}/invites/{invite_id}")
async def revoke_invite(
    client_id: str,
    invite_id: str,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    client = await _owned_client(db, client_id, owner)
    invite = (
        await db.execute(
            select(ClientInvite).where(
                ClientInvite.id == invite_id, ClientInvite.client_id == client.id
            )
        )
    ).scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")
    invite.revoked = True
    await db.commit()
    return {"revoked": True}


# ---- members ----
@router.get("/clients/{client_id}/members")
async def list_members(
    client_id: str,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    client = await _owned_client(db, client_id, owner)
    rows = (
        await db.execute(
            select(ClientMember, Member)
            .join(Member, Member.id == ClientMember.member_id)
            .where(ClientMember.client_id == client.id)
            .order_by(Member.name)
        )
    ).all()
    return [
        {
            "member_id": m.id,
            "name": m.name,
            "email": m.email,
            "tag": m.tag,
            "role": cm.role,
        }
        for cm, m in rows
    ]


@router.patch("/clients/{client_id}/members/{member_id}")
async def update_member_role(
    client_id: str,
    member_id: str,
    body: RoleUpdate,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="role must be admin or viewer")
    client = await _owned_client(db, client_id, owner)
    cm = (
        await db.execute(
            select(ClientMember).where(
                ClientMember.client_id == client.id, ClientMember.member_id == member_id
            )
        )
    ).scalar_one_or_none()
    if cm is None:
        raise HTTPException(status_code=404, detail="Member not on this client")
    cm.role = body.role
    await db.commit()
    return {"member_id": member_id, "role": cm.role}


@router.delete("/clients/{client_id}/members/{member_id}")
async def remove_member(
    client_id: str,
    member_id: str,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a client. Keeps the Member (agency identity + tag) but
    bumps their token_version to kill any live sessions immediately."""
    client = await _owned_client(db, client_id, owner)
    cm = (
        await db.execute(
            select(ClientMember).where(
                ClientMember.client_id == client.id, ClientMember.member_id == member_id
            )
        )
    ).scalar_one_or_none()
    if cm is None:
        raise HTTPException(status_code=404, detail="Member not on this client")
    member = (
        await db.execute(select(Member).where(Member.id == member_id))
    ).scalar_one_or_none()
    await db.delete(cm)
    if member is not None and not member.is_owner:
        member.token_version += 1  # revoke their live sessions
    await db.commit()
    return {"removed": True}
