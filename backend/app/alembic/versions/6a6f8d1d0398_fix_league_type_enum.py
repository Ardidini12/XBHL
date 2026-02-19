"""fix_league_type_enum

Revision ID: 6a6f8d1d0398
Revises: 7259a1c6a543
Create Date: 2026-02-19 08:03:41.086320

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '6a6f8d1d0398'
down_revision = '7259a1c6a543'
branch_labels = None
depends_on = None


def upgrade():
    # Create the enum type first, then alter the column to use it
    leaguetype = sa.Enum('THREE_V_THREE', 'SIX_V_SIX', name='leaguetype')
    leaguetype.create(op.get_bind())
    op.alter_column('league', 'league_type',
               existing_type=sa.VARCHAR(length=10),
               type_=leaguetype,
               existing_nullable=False,
               postgresql_using='league_type::text::leaguetype')


def downgrade():
    # Revert the column back to VARCHAR, then drop the enum type
    op.alter_column('league', 'league_type',
               existing_type=sa.Enum('THREE_V_THREE', 'SIX_V_SIX', name='leaguetype'),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False,
               postgresql_using='league_type::text')
    sa.Enum(name='leaguetype').drop(op.get_bind())
