from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import Agency
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_agency,
)

router = APIRouter()


# ---- request / response shapes ----
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AgencyOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    plan: str

    model_config = {"from_attributes": True}  # lets it read from a SQLAlchemy object


class TokenResponse(BaseModel):
    token: str
    agency: AgencyOut


# ---- routes ----
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(select(Agency).where(Agency.email == body.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    agency = Agency(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(agency)
    await db.commit()
    await db.refresh(agency)
    return {"token": create_access_token(agency.id), "agency": agency}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    agency = (
        await db.execute(select(Agency).where(Agency.email == body.email))
    ).scalar_one_or_none()
    if not agency or not verify_password(body.password, agency.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_access_token(agency.id), "agency": agency}


@router.get("/me", response_model=AgencyOut)
async def me(agency: Agency = Depends(get_current_agency)):
    return agency