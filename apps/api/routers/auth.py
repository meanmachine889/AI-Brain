from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.ratelimit import auth_rate_limit
from core.security import (
    verify_google_id_token,
    create_session_token,
    create_refresh_token,
    member_from_refresh_token,
    create_onboarding_token,
    read_onboarding_token,
    hash_invite_token,
    get_current_member,
)
from db.session import get_db, get_owner_db
from db.models import Agency, Member, Client, ClientMember, ClientInvite

router = APIRouter()
optional_bearer = HTTPBearer(auto_error=False)


# ---- request / response shapes ----
class GoogleAuthRequest(BaseModel):
    id_token: str


class CreateAgencyRequest(BaseModel):
    onboarding_token: str
    agency_name: str
    name: str


class AcceptInviteRequest(BaseModel):
    invite_token: str
    onboarding_token: str | None = None  # for brand-new users (no session yet)


class RefreshRequest(BaseModel):
    refresh_token: str


def _me(member: Member, agency: Agency, memberships: list[dict]) -> dict:
    return {
        "id": member.id,
        "email": member.email,
        "name": member.name,
        "tag": member.tag,
        "is_owner": member.is_owner,
        "agency": {"id": agency.id, "name": agency.name, "plan": agency.plan},
        "memberships": memberships,  # [{client_id, client_name, role}]
    }


async def _session_response(db: AsyncSession, member: Member) -> dict:
    agency = (
        await db.execute(select(Agency).where(Agency.id == member.agency_id))
    ).scalar_one()
    rows = (
        await db.execute(
            select(ClientMember, Client.name)
            .join(Client, Client.id == ClientMember.client_id)
            .where(ClientMember.member_id == member.id)
        )
    ).all()
    memberships = [
        {"client_id": cm.client_id, "client_name": cname, "role": cm.role}
        for cm, cname in rows
    ]
    return {
        "token": create_session_token(member),
        "refresh_token": create_refresh_token(member),
        "principal": _me(member, agency, memberships),
    }


# ---- Google sign-in: resolve the identity ----
@router.post("/google", dependencies=[auth_rate_limit("auth_google")])
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_owner_db)):
    """Verify a Google ID token and resolve it:
    - existing owner/member -> a session
    - else with pending invite(s) -> onboarding token + invite previews (accept popup)
    - else brand new -> onboarding token (frontend offers 'create your agency')
    A successful Google login is NOT access by itself.
    """
    identity = verify_google_id_token(body.id_token)

    member = (
        await db.execute(select(Member).where(Member.google_sub == identity["sub"]))
    ).scalar_one_or_none()
    if member is None:
        # backfilled owner (or any member created before first login) claims by email
        member = (
            await db.execute(
                select(Member).where(
                    Member.email == identity["email"], Member.google_sub.is_(None)
                )
            )
        ).scalar_one_or_none()
        if member is not None:
            member.google_sub = identity["sub"]
            await db.commit()

    if member is not None:
        return {"status": "ok", **(await _session_response(db, member))}

    # no account yet -> gather any valid pending invites for this email
    now = datetime.utcnow()
    invite_rows = (
        await db.execute(
            select(ClientInvite, Client.name, Agency.name)
            .join(Client, Client.id == ClientInvite.client_id)
            .join(Agency, Agency.id == Client.agency_id)
            .where(
                ClientInvite.email == identity["email"].lower(),
                ClientInvite.revoked.is_(False),
                ClientInvite.expires_at > now,
                ClientInvite.uses < ClientInvite.max_uses,
            )
        )
    ).all()
    invites = [
        {
            "agency_name": aname,
            "client_name": cname,
            "role": inv.role,
            "tag": inv.tag,
        }
        for inv, cname, aname in invite_rows
    ]
    return {
        "status": "needs_onboarding",
        "identity": {"email": identity["email"], "name": identity["name"]},
        "onboarding_token": create_onboarding_token(identity),
        "invites": invites,
    }


# ---- new user creates their own agency (becomes owner) ----
@router.post("/create-agency")
async def create_agency(body: CreateAgencyRequest, db: AsyncSession = Depends(get_owner_db)):
    ident = read_onboarding_token(body.onboarding_token)

    existing = (
        await db.execute(select(Member).where(Member.email == ident["email"]))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Account already exists for this email")

    agency = Agency(name=body.agency_name.strip())
    db.add(agency)
    await db.flush()
    owner = Member(
        agency_id=agency.id,
        email=ident["email"],
        google_sub=ident["sub"],
        name=body.name.strip() or ident["name"],
        is_owner=True,
    )
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return await _session_response(db, owner)


# ---- invite acceptance ----
async def _load_valid_invite(db: AsyncSession, invite_token: str, email: str) -> ClientInvite:
    invite = (
        await db.execute(
            select(ClientInvite).where(ClientInvite.token_hash == hash_invite_token(invite_token))
        )
    ).scalar_one_or_none()
    if invite is None or invite.revoked:
        raise HTTPException(status_code=400, detail="Invalid invite")
    if invite.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite expired")
    if invite.uses >= invite.max_uses:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="This invite is for a different email")
    return invite


@router.get("/invite-preview", dependencies=[auth_rate_limit("auth_invite_preview")])
async def invite_preview(token: str, db: AsyncSession = Depends(get_owner_db)):
    """For the 'You've been invited to {Agency}' popup. Reveals only names/role."""
    invite = (
        await db.execute(
            select(ClientInvite, Client.name, Agency.name)
            .join(Client, Client.id == ClientInvite.client_id)
            .join(Agency, Agency.id == Client.agency_id)
            .where(ClientInvite.token_hash == hash_invite_token(token))
        )
    ).first()
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")
    inv, client_name, agency_name = invite
    valid = (
        not inv.revoked and inv.expires_at > datetime.utcnow() and inv.uses < inv.max_uses
    )
    return {
        "agency_name": agency_name,
        "client_name": client_name,
        "role": inv.role,
        "email": inv.email,
        "valid": valid,
    }


@router.post("/accept-invite", dependencies=[auth_rate_limit("auth_accept_invite")])
async def accept_invite(
    body: AcceptInviteRequest,
    db: AsyncSession = Depends(get_owner_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
):
    """Accept a per-client invite. The actor is either an existing member (session
    bearer) or a brand-new user (onboarding_token)."""
    member: Member | None = None
    identity: dict | None = None

    if credentials is not None:  # existing member, already has a session
        try:
            payload = jwt.decode(
                credentials.credentials, settings.jwt_secret, algorithms=["HS256"]
            )
            member = (
                await db.execute(select(Member).where(Member.id == payload.get("sub")))
            ).scalar_one_or_none()
            if member and payload.get("tv") != member.token_version:
                member = None
        except jwt.PyJWTError:
            member = None
    if member is None:
        if not body.onboarding_token:
            raise HTTPException(status_code=401, detail="Sign in first")
        identity = read_onboarding_token(body.onboarding_token)

    email = member.email if member else identity["email"]
    invite = await _load_valid_invite(db, body.invite_token, email)

    client = (
        await db.execute(select(Client).where(Client.id == invite.client_id))
    ).scalar_one()

    if member is None:
        # brand-new user -> create the agency Member (tag from the invite)
        member = Member(
            agency_id=client.agency_id,
            email=identity["email"],
            google_sub=identity["sub"],
            name=identity["name"],
            tag=invite.tag,
            is_owner=False,
        )
        db.add(member)
        await db.flush()
    elif member.agency_id != client.agency_id:
        # one email = one agency: can't be pulled into a second agency
        raise HTTPException(status_code=403, detail="Account belongs to another agency")

    existing_cm = (
        await db.execute(
            select(ClientMember).where(
                ClientMember.client_id == client.id, ClientMember.member_id == member.id
            )
        )
    ).scalar_one_or_none()
    if existing_cm is None:
        db.add(ClientMember(client_id=client.id, member_id=member.id, role=invite.role))
    else:
        existing_cm.role = invite.role  # re-invite can update role

    invite.uses += 1
    await db.commit()
    await db.refresh(member)
    return await _session_response(db, member)


# ---- session management ----
@router.post("/logout")
async def logout(
    member: Member = Depends(get_current_member), db: AsyncSession = Depends(get_db)
):
    """Invalidate all of this member's outstanding tokens (anti-replay)."""
    member.token_version += 1
    await db.commit()
    return {"logged_out": True}


@router.post("/refresh", dependencies=[auth_rate_limit("auth_refresh")])
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_owner_db)):
    """Exchange a valid refresh token for a fresh short-lived access token (and a
    rotated refresh token). Returns 401 if the refresh token was revoked (logout
    bumped token_version) or expired."""
    member = await member_from_refresh_token(body.refresh_token, db)
    return {
        "token": create_session_token(member),
        "refresh_token": create_refresh_token(member),
    }


@router.get("/me")
async def me(
    member: Member = Depends(get_current_member), db: AsyncSession = Depends(get_db)
):
    return (await _session_response(db, member))["principal"]
