from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, JSON, Integer, Index
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


class Agency(Base):
    __tablename__ = "agencies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="trial")  # trial | paid
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    clients = relationship("Client", back_populates="agency", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="agency", cascade="all, delete-orphan")
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)   # <-- add this
    plan: Mapped[str] = mapped_column(String(50), default="trial")



class Client(Base):
    __tablename__ = "clients"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id: Mapped[str] = mapped_column(ForeignKey("agencies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255))  # match emails/events by domain
    contact_emails: Mapped[list] = mapped_column(JSON, default=list)  # extra exact addresses to match
    slack_channel_ids: Mapped[list] = mapped_column(JSON, default=list)
    jira_project_keys: Mapped[list] = mapped_column(JSON, default=list)
    drive_folder_ids: Mapped[list] = mapped_column(JSON, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    agency = relationship("Agency", back_populates="clients")


class Integration(Base):
    __tablename__ = "integrations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id: Mapped[str] = mapped_column(ForeignKey("agencies.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # slack | gmail | jira | drive
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # encrypt at rest in prod
    refresh_token: Mapped[str | None] = mapped_column(Text)
    workspace_id: Mapped[str | None] = mapped_column(String(255))
    workspace_name: Mapped[str | None] = mapped_column(String(255))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    scopes: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    agency = relationship("Agency", back_populates="integrations")


class DataChunk(Base):
    __tablename__ = "data_chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
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
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # low | medium | high
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
