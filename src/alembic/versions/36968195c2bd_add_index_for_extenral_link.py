"""add_index_for_extenral_link

Revision ID: 36968195c2bd
Revises: 5a96617a6504
Create Date: 2026-06-04 13:01:13.080595

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '36968195c2bd'
down_revision = 'dced98c13af1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('external_link_index', 'endeavor', ['external_link'], unique=False)


def downgrade() -> None:
    op.drop_index('external_link_index', table_name='endeavor')
