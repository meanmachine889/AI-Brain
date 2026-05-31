from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from db.session import get_db
from db.models import Agency

bearer = HTTPBearer()

ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(agency_id: str) -> str:
    payload = {
        "agency_id": agency_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def get_current_agency(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Agency:
    """Dependency: decode the Bearer token, load and return the Agency."""
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=["HS256"]
        )
        agency_id = payload.get("agency_id")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    agency = (
        await db.execute(select(Agency).where(Agency.id == agency_id))
    ).scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=401, detail="Agency not found")
    return agency