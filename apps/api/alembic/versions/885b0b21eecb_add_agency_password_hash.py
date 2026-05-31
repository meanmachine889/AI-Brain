"""add agency password_hash

Revision ID: 885b0b21eecb
Revises: e8a046fe7204
Create Date: 2026-05-30 16:13:52.670685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '885b0b21eecb'
down_revision: Union[str, None] = 'e8a046fe7204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agencies', sa.Column('password_hash', sa.String(length=255), nullable=False))


def downgrade() -> None:
    op.drop_column('agencies', 'password_hash')
