"""Postgres row-level security for tenant isolation

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-04

Defense-in-depth so a forgotten agency_id filter in application code fails closed
(returns zero rows) instead of leaking another agency's private data.

Model:
  - The table owner (`agency`) BYPASSES RLS — used by Celery workers (cross-tenant
    by design) and Alembic.
  - A restricted login role (`app_user`) is used by the API request path and IS
    subject to RLS. Each request sets `app.current_agency_id` (see
    db.session.set_agency_context); policies scope rows to that agency.
  - RLS is applied to the 5 tenant tables. NOT to `agencies` — login/register must
    query it before any agency context exists.

Prod note: provision `app_user` with a strong password from your secrets manager
BEFORE running this (the CREATE ROLE below is skipped if it already exists, so the
prod password is preserved). Point APP_DATABASE_URL at this role.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# tables scoped directly by agency_id
_AGENCY_TABLES = ["clients", "integrations"]
# tables scoped indirectly via their client's agency
_CLIENT_TABLES = ["data_chunks", "summaries", "alerts"]
_ALL = _AGENCY_TABLES + _CLIENT_TABLES

_AGENCY = "current_setting('app.current_agency_id', true)"


def upgrade() -> None:
    # 1. restricted role (dev fallback password; prod pre-provisions the role so
    #    this CREATE is skipped and the real password is kept).
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
            CREATE ROLE app_user LOGIN PASSWORD 'app_user';
          END IF;
        END $$;
        """
    )
    op.execute("GRANT CONNECT ON DATABASE agency_brain TO app_user")
    op.execute("GRANT USAGE ON SCHEMA public TO app_user")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user"
    )

    # 2. enable RLS + policies. FOR ALL covers select/insert/update/delete; the
    #    USING clause filters reads/updates/deletes, WITH CHECK guards writes.
    for t in _AGENCY_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY {t}_agency_isolation ON {t} FOR ALL "
            f"USING (agency_id = {_AGENCY}) "
            f"WITH CHECK (agency_id = {_AGENCY})"
        )

    for t in _CLIENT_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY {t}_agency_isolation ON {t} FOR ALL "
            f"USING (client_id IN (SELECT id FROM clients WHERE agency_id = {_AGENCY})) "
            f"WITH CHECK (client_id IN (SELECT id FROM clients WHERE agency_id = {_AGENCY}))"
        )


def downgrade() -> None:
    for t in _ALL:
        op.execute(f"DROP POLICY IF EXISTS {t}_agency_isolation ON {t}")
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
    op.execute(
        "REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_user"
    )
    # role is left in place (cluster-level, may be shared / prod-managed)
