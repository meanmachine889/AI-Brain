import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from slack_sdk.web.async_client import AsyncWebClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import require_owner
from db.session import get_db, set_principal_context
from db.models import Client, DataChunk, Integration, Member

GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"

logger = logging.getLogger(__name__)

router = APIRouter()

SLACK_SCOPES = [
    "channels:history", "channels:read",
    "groups:history", "groups:read",
    "users:read", "team:read",
]

# offline_access -> get a refresh_token (Jira access tokens expire in ~1h)
JIRA_SCOPES = ["read:jira-work", "read:jira-user", "offline_access"]
JIRA_AUTH_URL = "https://auth.atlassian.com/authorize"
JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


# ---- signed state: carries agency_id through the OAuth round-trip ----
def _make_state(agency_id: str) -> str:
    return jwt.encode(
        {
            "agency_id": agency_id,
            "purpose": "oauth",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.oauth_state_signing_key,
        algorithm="HS256",
    )


def _read_state(state: str) -> str:
    try:
        payload = jwt.decode(
            state, settings.oauth_state_signing_key, algorithms=["HS256"]
        )
        if payload.get("purpose") != "oauth":
            raise ValueError("wrong purpose")
        return payload["agency_id"]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")


# ---- Slack OAuth ----
@router.get("/slack/connect")
async def slack_connect(owner: Member = Depends(require_owner)):
    """Returns the Slack authorize URL. Frontend (or you) opens it in a browser."""
    params = {
        "client_id": settings.slack_client_id,
        "scope": ",".join(SLACK_SCOPES),
        "redirect_uri": settings.slack_redirect_uri,
        "state": _make_state(owner.agency_id),
    }
    return {"url": "https://slack.com/oauth/v2/authorize?" + urlencode(params)}


@router.get("/slack/callback")
async def slack_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Slack redirects here. Exchange code -> bot token, store it, kick off ingestion."""
    agency_id = _read_state(state)
    await set_principal_context(db, agency_id)  # owner context (OAuth is owner-only)

    resp = await AsyncWebClient().oauth_v2_access(
        client_id=settings.slack_client_id,
        client_secret=settings.slack_client_secret,
        code=code,
        redirect_uri=settings.slack_redirect_uri,
    )
    if not resp.get("ok"):
        raise HTTPException(status_code=400, detail=f"Slack OAuth failed: {resp.get('error')}")

    access_token = resp["access_token"]          # bot token (xoxb-...)
    team = resp.get("team", {})

    existing = (
        await db.execute(
            select(Integration).where(
                Integration.agency_id == agency_id,
                Integration.provider == "slack",
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.access_token = access_token
        existing.workspace_id = team.get("id")
        existing.workspace_name = team.get("name")
        existing.scopes = SLACK_SCOPES
    else:
        db.add(Integration(
            agency_id=agency_id,
            provider="slack",
            access_token=access_token,
            workspace_id=team.get("id"),
            workspace_name=team.get("name"),
            scopes=SLACK_SCOPES,
        ))
    await db.commit()

    from workers.ingestion.slack import ingest_for_agency
    ingest_for_agency.delay(agency_id)

    return RedirectResponse(url=f"{settings.frontend_url}/integrations?connected=slack")


@router.post("/slack/sync")
async def slack_sync(owner: Member = Depends(require_owner)):
    """Manual re-ingest trigger (a 'Sync now' button, and handy for testing)."""
    from workers.ingestion.slack import ingest_for_agency
    ingest_for_agency.delay(owner.agency_id)
    return {"status": "ingestion triggered"}


# ---- Jira OAuth (3LO) ----
@router.get("/jira/connect")
async def jira_connect(owner: Member = Depends(require_owner)):
    params = {
        "audience": "api.atlassian.com",
        "client_id": settings.jira_client_id,
        "scope": " ".join(JIRA_SCOPES),       # includes offline_access -> refresh token
        "redirect_uri": settings.jira_redirect_uri,
        "state": _make_state(owner.agency_id),
        "response_type": "code",
        "prompt": "consent",
    }
    return {"url": f"{JIRA_AUTH_URL}?" + urlencode(params)}


@router.get("/jira/callback")
async def jira_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    agency_id = _read_state(state)
    await set_principal_context(db, agency_id)  # owner context (OAuth is owner-only)

    async with httpx.AsyncClient(timeout=30) as http:
        # 1. exchange the auth code for tokens
        token_resp = await http.post(
            JIRA_TOKEN_URL,
            json={
                "grant_type": "authorization_code",
                "client_id": settings.jira_client_id,
                "client_secret": settings.jira_client_secret,
                "code": code,
                "redirect_uri": settings.jira_redirect_uri,
            },
        )
        if token_resp.status_code != 200:
            logger.error("Jira token exchange failed: %s", token_resp.text)
            raise HTTPException(status_code=400, detail="Jira token exchange failed")
        tok = token_resp.json()

        # 2. look up the cloudid of the authorized site
        res_resp = await http.get(
            JIRA_RESOURCES_URL,
            headers={"Authorization": f"Bearer {tok['access_token']}"},
        )
        resources = res_resp.json()
        if not resources:
            raise HTTPException(status_code=400, detail="No accessible Jira sites for this account")
        site = resources[0]  # first authorized site

    expires_at = datetime.utcnow() + timedelta(seconds=tok.get("expires_in", 3600))

    existing = (
        await db.execute(
            select(Integration).where(
                Integration.agency_id == agency_id,
                Integration.provider == "jira",
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.access_token = tok["access_token"]
        existing.refresh_token = tok.get("refresh_token")
        existing.workspace_id = site["id"]          # cloudid
        existing.workspace_name = site.get("name") or site.get("url")
        existing.expires_at = expires_at
        existing.scopes = JIRA_SCOPES
    else:
        db.add(Integration(
            agency_id=agency_id,
            provider="jira",
            access_token=tok["access_token"],
            refresh_token=tok.get("refresh_token"),
            workspace_id=site["id"],
            workspace_name=site.get("name") or site.get("url"),
            expires_at=expires_at,
            scopes=JIRA_SCOPES,
        ))
    await db.commit()

    from workers.ingestion.jira import ingest_for_agency
    ingest_for_agency.delay(agency_id)

    return RedirectResponse(url=f"{settings.frontend_url}/integrations?connected=jira")


# ---- Gmail OAuth (Google) ----
@router.get("/gmail/connect")
async def gmail_connect(owner: Member = Depends(require_owner)):
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",   # -> refresh token
        "prompt": "consent",        # force refresh token even on re-connect
        "state": _make_state(owner.agency_id),
    }
    return {"url": f"{GOOGLE_AUTH_URL}?" + urlencode(params)}


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    agency_id = _read_state(state)
    await set_principal_context(db, agency_id)  # owner context (OAuth is owner-only)

    async with httpx.AsyncClient(timeout=30) as http:
        token_resp = await http.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: %s", token_resp.text)
            raise HTTPException(status_code=400, detail="Google token exchange failed")
        tok = token_resp.json()

        # identify the connected mailbox
        prof = await http.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {tok['access_token']}"},
        )
        email = prof.json().get("emailAddress")

    expires_at = datetime.utcnow() + timedelta(seconds=tok.get("expires_in", 3600))

    existing = (
        await db.execute(
            select(Integration).where(
                Integration.agency_id == agency_id,
                Integration.provider == "gmail",
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.access_token = tok["access_token"]
        if tok.get("refresh_token"):  # Google omits it on re-consent sometimes
            existing.refresh_token = tok["refresh_token"]
        existing.workspace_name = email
        existing.expires_at = expires_at
        existing.scopes = GMAIL_SCOPES
    else:
        db.add(Integration(
            agency_id=agency_id,
            provider="gmail",
            access_token=tok["access_token"],
            refresh_token=tok.get("refresh_token"),
            workspace_name=email,
            expires_at=expires_at,
            scopes=GMAIL_SCOPES,
        ))
    await db.commit()

    from workers.ingestion.gmail import ingest_for_agency
    ingest_for_agency.delay(agency_id)

    return RedirectResponse(url=f"{settings.frontend_url}/integrations?connected=gmail")


# ---- generic sync: fan out to whatever this agency has connected ----
@router.post("/sync")
async def sync_all(
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    integs = (
        await db.execute(select(Integration).where(Integration.agency_id == owner.agency_id))
    ).scalars().all()
    triggered = []
    for i in integs:
        if i.provider == "slack":
            from workers.ingestion.slack import ingest_for_agency as slack_ingest
            slack_ingest.delay(owner.agency_id)
            triggered.append("slack")
        elif i.provider == "jira":
            from workers.ingestion.jira import ingest_for_agency as jira_ingest
            jira_ingest.delay(owner.agency_id)
            triggered.append("jira")
        elif i.provider == "gmail":
            from workers.ingestion.gmail import ingest_for_agency as gmail_ingest
            gmail_ingest.delay(owner.agency_id)
            triggered.append("gmail")
    return {"triggered": triggered}


# ---- generic integration management ----
@router.get("")
async def list_integrations(
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    integs = (
        await db.execute(select(Integration).where(Integration.agency_id == owner.agency_id))
    ).scalars().all()
    return [
        {
            "provider": i.provider,
            "workspace_name": i.workspace_name,
            "connected_at": i.created_at,
            "scopes": i.scopes,
        }
        for i in integs
    ]


async def _revoke_remote_token(integ: Integration) -> None:
    """Best-effort: tell the provider to kill the token so leaked copies die too.

    Never raises — a failed revoke must not block disconnecting. (Atlassian/Jira
    has no public OAuth revoke endpoint; its access tokens expire in ~1h.)
    """
    try:
        if integ.provider == "slack":
            await AsyncWebClient(token=integ.access_token).auth_revoke()
        elif integ.provider == "gmail":
            # revoking the refresh token revokes the whole grant
            token = integ.refresh_token or integ.access_token
            async with httpx.AsyncClient(timeout=15) as http:
                await http.post(GOOGLE_REVOKE_URL, data={"token": token})
    except Exception:
        pass


@router.delete("/{provider}")
async def delete_integration(
    provider: str,
    owner: Member = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    integ = (
        await db.execute(
            select(Integration).where(
                Integration.agency_id == owner.agency_id,
                Integration.provider == provider,
            )
        )
    ).scalar_one_or_none()
    if not integ:
        raise HTTPException(status_code=404, detail="Integration not found")

    # 1. kill the token at the provider (best-effort, even leaked copies)
    await _revoke_remote_token(integ)

    # 2. purge the data we ingested from this source for this agency's clients
    client_ids = select(Client.id).where(Client.agency_id == owner.agency_id)
    await db.execute(
        delete(DataChunk).where(
            DataChunk.client_id.in_(client_ids),
            DataChunk.source == provider,
        )
    )

    # 3. drop our stored token
    await db.delete(integ)
    await db.commit()
    return {"deleted": True}
