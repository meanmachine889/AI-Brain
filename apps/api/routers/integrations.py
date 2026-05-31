from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from slack_sdk.web.async_client import AsyncWebClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import get_current_agency
from db.session import get_db
from db.models import Agency, Integration

router = APIRouter()

SLACK_SCOPES = [
    "channels:history", "channels:read",
    "groups:history", "groups:read",
    "users:read", "team:read",
]


# ---- signed state: carries agency_id through the OAuth round-trip ----
def _make_state(agency_id: str) -> str:
    return jwt.encode(
        {
            "agency_id": agency_id,
            "purpose": "oauth",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def _read_state(state: str) -> str:
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("purpose") != "oauth":
            raise ValueError("wrong purpose")
        return payload["agency_id"]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")


# ---- Slack OAuth ----
@router.get("/slack/connect")
async def slack_connect(agency: Agency = Depends(get_current_agency)):
    """Returns the Slack authorize URL. Frontend (or you) opens it in a browser."""
    params = {
        "client_id": settings.slack_client_id,
        "scope": ",".join(SLACK_SCOPES),
        "redirect_uri": settings.slack_redirect_uri,
        "state": _make_state(agency.id),
    }
    return {"url": "https://slack.com/oauth/v2/authorize?" + urlencode(params)}


@router.get("/slack/callback")
async def slack_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Slack redirects here. Exchange code -> bot token, store it, kick off ingestion."""
    agency_id = _read_state(state)

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

    return RedirectResponse(url="http://localhost:3000/integrations?connected=slack")


@router.post("/slack/sync")
async def slack_sync(agency: Agency = Depends(get_current_agency)):
    """Manual re-ingest trigger (a 'Sync now' button, and handy for testing)."""
    from workers.ingestion.slack import ingest_for_agency
    ingest_for_agency.delay(agency.id)
    return {"status": "ingestion triggered"}


# ---- generic integration management ----
@router.get("")
async def list_integrations(
    agency: Agency = Depends(get_current_agency),
    db: AsyncSession = Depends(get_db),
):
    integs = (
        await db.execute(select(Integration).where(Integration.agency_id == agency.id))
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


@router.delete("/{provider}")
async def delete_integration(
    provider: str,
    agency: Agency = Depends(get_current_agency),
    db: AsyncSession = Depends(get_db),
):
    integ = (
        await db.execute(
            select(Integration).where(
                Integration.agency_id == agency.id,
                Integration.provider == provider,
            )
        )
    ).scalar_one_or_none()
    if not integ:
        raise HTTPException(status_code=404, detail="Integration not found")
    await db.delete(integ)
    await db.commit()
    return {"deleted": True}
