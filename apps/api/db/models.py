from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, JSON, Integer, Index
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from db.types import EncryptedString


class Base(DeclarativeBase):
    pass


class Agency(Base):
    __tablename__ = "agencies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="trial")  # trial | paid
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # Auth lives on Member now (Google sign-in); the agency is just the tenant.
    members = relationship("Member", back_populates="agency", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="agency", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="agency", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id: Mapped[str] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255))  # match emails/events by domain
    contact_emails: Mapped[list] = mapped_column(JSON, default=list)  # extra exact addresses to match
    slack_channel_ids: Mapped[list] = mapped_column(JSON, default=list)
    jira_project_keys: Mapped[list] = mapped_column(JSON, default=list)
    drive_folder_ids: Mapped[list] = mapped_column(JSON, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    agency = relationship("Agency", back_populates="clients")
    # deleting a client purges all its ingested personal data (erasure)
    data_chunks = relationship("DataChunk", back_populates="client", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="client", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="client", cascade="all, delete-orphan")
    client_members = relationship("ClientMember", back_populates="client", cascade="all, delete-orphan")
    invites = relationship("ClientInvite", back_populates="client", cascade="all, delete-orphan")


class Integration(Base):
    __tablename__ = "integrations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id: Mapped[str] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # slack | gmail | jira | drive
    # OAuth tokens are encrypted at rest (see db.types.EncryptedString / core.crypto)
    access_token: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(EncryptedString)
    workspace_id: Mapped[str | None] = mapped_column(String(255))
    workspace_name: Mapped[str | None] = mapped_column(String(255))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    scopes: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    agency = relationship("Agency", back_populates="integrations")


class DataChunk(Base):
    __tablename__ = "data_chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client = relationship("Client", back_populates="data_chunks")
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # slack | gmail | jira | drive
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    source_timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Declare the HNSW index here so Alembic autogenerate recognizes it (created
    # in migration e8a046fe7204) and stops trying to drop it on every revision.
    __table_args__ = (
        Index(
            "data_chunks_embedding_idx",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class Summary(Base):
    __tablename__ = "summaries"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client = relationship("Client", back_populates="summaries")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client = relationship("Client", back_populates="alerts")
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # low | medium | high
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Member(Base):
    """A person who logs in (Google), scoped to one agency. The owner is the
    Member with is_owner=true and sees all clients; others get per-client access
    via ClientMember."""
    __tablename__ = "members"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id: Mapped[str] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # Google email
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)  # set on first login
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tag: Mapped[str | None] = mapped_column(String(100))  # agency-wide free text, e.g. "Designer"
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # bumped on logout / removal -> invalidates that member's outstanding JWTs
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    agency = relationship("Agency", back_populates="members")
    client_members = relationship("ClientMember", back_populates="member", cascade="all, delete-orphan")


class ClientMember(Base):
    """Per-client access grant for a (non-owner) member."""
    __tablename__ = "client_members"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[str] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # admin | viewer
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    client = relationship("Client", back_populates="client_members")
    member = relationship("Member", back_populates="client_members")
    __table_args__ = (
        Index("ux_client_member", "client_id", "member_id", unique=True),
    )


class ClientInvite(Base):
    """A per-client invite link (owner-created). Only the token hash is stored."""
    __tablename__ = "client_invites"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)  # the invited Google email
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # admin | viewer
    tag: Mapped[str | None] = mapped_column(String(100))  # applied if this creates the Member
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # sha256 hex
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    max_uses: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    client = relationship("Client", back_populates="invites")
