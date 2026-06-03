"""encrypt OAuth tokens at rest + ON DELETE CASCADE for erasure

Revision ID: a1b2c3d4e5f6
Revises: 403de93ef919
Create Date: 2026-06-03

Two security fixes:
  1. Backfill-encrypt existing plaintext OAuth tokens in `integrations`.
     (The column type is still TEXT; encryption is applied in the app via
     db.types.EncryptedString, so this is a data migration, not a schema change.)
  2. Recreate the client/agency foreign keys with ON DELETE CASCADE so deleting a
     client or agency hard-purges its ingested personal data (chunks/summaries/
     alerts/integrations) — enabling right-to-erasure and fixing the previously
     broken DELETE that errored on FK violations.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from core.crypto import encrypt, is_encrypted

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "403de93ef919"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, fk_name, local_col, remote_table) — default Postgres fk names from initial schema
_FKS = [
    ("clients", "clients_agency_id_fkey", "agency_id", "agencies"),
    ("integrations", "integrations_agency_id_fkey", "agency_id", "agencies"),
    ("data_chunks", "data_chunks_client_id_fkey", "client_id", "clients"),
    ("summaries", "summaries_client_id_fkey", "client_id", "clients"),
    ("alerts", "alerts_client_id_fkey", "client_id", "clients"),
]


def _backfill_encrypt() -> None:
    """Encrypt any plaintext tokens in place (idempotent via the version prefix)."""
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, access_token, refresh_token FROM integrations")
    ).fetchall()
    for row in rows:
        updates = {}
        if row.access_token is not None and not is_encrypted(row.access_token):
            updates["access_token"] = encrypt(row.access_token)
        if row.refresh_token is not None and not is_encrypted(row.refresh_token):
            updates["refresh_token"] = encrypt(row.refresh_token)
        if updates:
            set_clause = ", ".join(f"{col} = :{col}" for col in updates)
            bind.execute(
                sa.text(f"UPDATE integrations SET {set_clause} WHERE id = :id"),
                {**updates, "id": row.id},
            )


def upgrade() -> None:
    _backfill_encrypt()

    for table, fk_name, local_col, remote_table in _FKS:
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.create_foreign_key(
            fk_name, table, remote_table, [local_col], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    # Recreate FKs without cascade. Token ciphertext is left as-is: the app still
    # reads it via EncryptedString. Decryption to plaintext is intentionally not
    # automated here (the key may have rotated); do it manually if ever required.
    for table, fk_name, local_col, remote_table in _FKS:
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.create_foreign_key(fk_name, table, remote_table, [local_col], ["id"])
