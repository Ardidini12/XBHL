"""add interval_seconds to scheduler_config

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-23 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'scheduler_config',
        sa.Column('interval_seconds', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade():
    op.drop_column('scheduler_config', 'interval_seconds')
