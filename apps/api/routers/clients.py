from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import Client, Agency, Member, ClientMember
from core.security import get_current_agency, get_current_member, require_owner
from core import audit

router = APIRouter()


# ---- request / response shapes ----
class ClientCreate(BaseModel):
    name: str
    domain: str | None = None
    contact_emails: list[str] = []
    slack_channel_ids: list[str] = []
    jira_project_keys: list[str] = []
    drive_folder_ids: list[str] = []


class ClientUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    contact_emails: list[str] | None = None
    slack_channel_ids: list[str] | None = None
    jira_project_keys: list[str] | None = None
    drive_folder_ids: list[str] | None = None
    metadata: dict | None = None


class ClientOut(BaseModel):
    id: str
    name: str
    domain: str | None
    contact_emails: list[str]
    slack_channel_ids: list[str]
    jira_project_keys: list[str]
    drive_folder_ids: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- helper: fetch a client in this agency, else 404 (RLS further scopes a
#      non-owner member to only their own clients) ----
async def _get_client(client_id: str, agency_id: str, db: AsyncSession) -> Client:
    client = (
        await db.execute(
            select(Client).where(
                Client.id == client_id,
                Client.agency_id == agency_id,   # <-- the scoping guard
            )
        )
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


# ---- routes (mounted under /clients in main.py) ----
@router.get("", response_model=list[ClientOut])
async def list_clients(
    agency: Agency = Depends(get_current_agency),
    db: AsyncSession = Depends(get_db),
):
    clients = (
        await db.execute(select(Client).where(Client.agency_id == agency.id))
    ).scalars().all()
    return clients


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(
    body: ClientCreate,
    owner: Member = Depends(require_owner),  # only the owner creates clients
    db: AsyncSession = Depends(get_db),
):
    client = Client(
        agency_id=owner.agency_id,
        name=body.name,
        domain=body.domain,
        contact_emails=body.contact_emails,
        slack_channel_ids=body.slack_channel_ids,
        jira_project_keys=body.jira_project_keys,
        drive_folder_ids=body.drive_folder_ids,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: str,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client(client_id, member.agency_id, db)
    await audit.record(
        member, audit.VIEW_CLIENT, client_id=client.id, client_name=client.name
    )
    return client


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    body: ClientUpdate,
    member: Member = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client(client_id, member.agency_id, db)
    # config edits: owner, or a client 'admin' on THIS client
    if not member.is_owner:
        cm = (
            await db.execute(
                select(ClientMember).where(
                    ClientMember.client_id == client.id,
                    ClientMember.member_id == member.id,
                )
            )
        ).scalar_one_or_none()
        if cm is None or cm.role != "admin":
            raise HTTPException(status_code=403, detail="Admin role required")

    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:                       # API field -> ORM attr metadata_
        client.metadata_ = updates.pop("metadata")
    for field, value in updates.items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    owner: Member = Depends(require_owner),  # only the owner deletes clients
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client(client_id, owner.agency_id, db)
    await db.delete(client)
    await db.commit()
    return {"deleted": True}
