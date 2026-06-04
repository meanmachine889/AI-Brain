"""RLS member context: per-client visibility for members; integrations owner-only

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-04

Extends the row-level security from agency-wide to member-aware using a second GUC,
app.current_member_id (empty string = owner -> sees all agency clients; otherwise the
member id -> sees only their ClientMember clients).

Only `clients` and `integrations` policies change:
  - clients: agency match AND (owner OR id in the member's ClientMember rows).
  - integrations: owner-only (members never see the agency's OAuth tokens).
  - data_chunks/summaries/alerts are unchanged: their policy selects from `clients`,
    and that inner select is itself RLS-filtered, so they inherit member visibility.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_AGENCY = "current_setting('app.current_agency_id', true)"
_MEMBER = "current_setting('app.current_member_id', true)"
_IS_OWNER = f"nullif({_MEMBER}, '') IS NULL"

# a client is visible if it's in the agency AND (we're the owner OR a member of it)
_CLIENT_VISIBLE = (
    f"agency_id = {_AGENCY} "
    f"AND ({_IS_OWNER} OR id IN "
    f"(SELECT client_id FROM client_members WHERE member_id = {_MEMBER}))"
)
# integrations: agency match AND owner only
_INTEG_OWNER = f"agency_id = {_AGENCY} AND {_IS_OWNER}"


def upgrade() -> None:
    op.execute("DROP POLICY IF EXISTS clients_agency_isolation ON clients")
    op.execute(
        f"CREATE POLICY clients_agency_isolation ON clients FOR ALL "
        f"USING ({_CLIENT_VISIBLE}) WITH CHECK ({_CLIENT_VISIBLE})"
    )

    op.execute("DROP POLICY IF EXISTS integrations_agency_isolation ON integrations")
    op.execute(
        f"CREATE POLICY integrations_agency_isolation ON integrations FOR ALL "
        f"USING ({_INTEG_OWNER}) WITH CHECK ({_INTEG_OWNER})"
    )


def downgrade() -> None:
    # restore the agency-only policies from b2c3d4e5f6a7
    op.execute("DROP POLICY IF EXISTS clients_agency_isolation ON clients")
    op.execute(
        f"CREATE POLICY clients_agency_isolation ON clients FOR ALL "
        f"USING (agency_id = {_AGENCY}) WITH CHECK (agency_id = {_AGENCY})"
    )
    op.execute("DROP POLICY IF EXISTS integrations_agency_isolation ON integrations")
    op.execute(
        f"CREATE POLICY integrations_agency_isolation ON integrations FOR ALL "
        f"USING (agency_id = {_AGENCY}) WITH CHECK (agency_id = {_AGENCY})"
    )
