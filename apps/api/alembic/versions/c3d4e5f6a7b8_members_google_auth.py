"""multi-user: members, per-client roles, invites (Google auth)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-04

Auth moves off the Agency (no more password) onto a Member (Google sign-in). Each
existing agency gets one owner Member backfilled from its old email. Members /
client_members / client_invites are identity/ACL tables — NOT under RLS (queried
before any agency context exists, e.g. login by email / accept by token); they are
app-scoped. The owner Member's google_sub is null until they first sign in with
Google (matched by email, then linked).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("agency_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("tag", sa.String(length=100), nullable=True),
        sa.Column("is_owner", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("token_version", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["agency_id"], ["agencies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("google_sub"),
    )
    op.create_index("ix_members_agency_id", "members", ["agency_id"])

    op.create_table(
        "client_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("member_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_members_client_id", "client_members", ["client_id"])
    op.create_index("ix_client_members_member_id", "client_members", ["member_id"])
    op.create_index("ux_client_member", "client_members", ["client_id", "member_id"], unique=True)

    op.create_table(
        "client_invites",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("tag", sa.String(length=100), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("max_uses", sa.Integer(), server_default="1", nullable=False),
        sa.Column("uses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_invites_client_id", "client_invites", ["client_id"])
    op.create_index("ix_client_invites_token_hash", "client_invites", ["token_hash"])

    # backfill one owner Member per agency from its old email (before dropping it)
    op.execute(
        """
        INSERT INTO members (id, agency_id, email, google_sub, name, tag, is_owner, token_version, created_at)
        SELECT gen_random_uuid()::text, a.id, a.email, NULL, a.name, NULL, true, 0, now()
        FROM agencies a
        """
    )

    op.drop_column("agencies", "password_hash")
    op.drop_column("agencies", "email")

    # app_user (RLS request-path role) needs CRUD on the new identity/ACL tables.
    # These tables are intentionally NOT under RLS (see module docstring).
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON members, client_members, client_invites TO app_user"
    )


def downgrade() -> None:
    op.add_column("agencies", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("agencies", sa.Column("password_hash", sa.String(length=255), nullable=True))
    # best-effort restore of the owner email
    op.execute(
        "UPDATE agencies a SET email = m.email FROM members m "
        "WHERE m.agency_id = a.id AND m.is_owner = true"
    )
    op.drop_table("client_invites")
    op.drop_table("client_members")
    op.drop_table("members")
