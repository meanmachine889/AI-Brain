import hashlib
import secrets as _secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from db.session import get_db, set_principal_context
from db.models import Agency, Member

bearer = HTTPBearer()

ACCESS_TOKEN_EXPIRE_DAYS = 7
ONBOARDING_TOKEN_EXPIRE_MINUTES = 20


# ---- Google sign-in ----
def verify_google_id_token(token: str) -> dict:
    """Verify a Google sign-in ID token; return {sub, email, name}. Raises 401.

    Factored out so tests can monkeypatch it without a live Google round-trip.
    """
    try:
        info = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.google_client_id
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email not verified")
    return {
        "sub": info["sub"],
        "email": info["email"],
        "name": info.get("name") or info["email"],
    }


# ---- our session token (Google is the IdP; we own the session for revocation) ----
def create_session_token(member: Member) -> str:
    payload = {
        "sub": member.id,
        "agency_id": member.agency_id,
        "tv": member.token_version,  # bumped on logout/removal -> instant revocation
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


# ---- short-lived onboarding token: carries a verified Google identity so a brand
#      new user can create an agency or accept an invite without a session yet ----
def create_onboarding_token(identity: dict) -> str:
    payload = {
        "purpose": "onboarding",
        "google_sub": identity["sub"],
        "email": identity["email"],
        "name": identity["name"],
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=ONBOARDING_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def read_onboarding_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("purpose") != "onboarding":
            raise ValueError("wrong purpose")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired onboarding token")
    return {
        "sub": payload["google_sub"],
        "email": payload["email"],
        "name": payload["name"],
    }


# ---- invite token helpers (only the hash is stored) ----
def new_invite_secret() -> str:
    return _secrets.token_urlsafe(32)


def hash_invite_token(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


# ---- dependencies ----
async def get_current_member(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Member:
    """Decode our session JWT, load the Member, enforce revocation, scope RLS."""
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=["HS256"]
        )
        member_id = payload.get("sub")
        token_version = payload.get("tv")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    member = (
        await db.execute(select(Member).where(Member.id == member_id))
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=401, detail="Account not found")
    if token_version != member.token_version:
        raise HTTPException(status_code=401, detail="Session expired, sign in again")

    # owner -> agency-wide; non-owner -> restricted to their ClientMember clients
    await set_principal_context(
        db, member.agency_id, None if member.is_owner else member.id
    )
    return member


async def get_current_agency(
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
) -> Agency:
    """Back-compat dependency for agency-scoped routers — returns the tenant."""
    agency = (
        await db.execute(select(Agency).where(Agency.id == member.agency_id))
    ).scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=401, detail="Agency not found")
    return agency


def require_owner(member: Member = Depends(get_current_member)) -> Member:
    if not member.is_owner:
        raise HTTPException(status_code=403, detail="Owner only")
    return member
