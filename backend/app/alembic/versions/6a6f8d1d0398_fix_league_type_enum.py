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
    # Create the enum type first (checkfirst=True makes this idempotent)
    leaguetype = sa.Enum('THREE_V_THREE', 'SIX_V_SIX', name='leaguetype')
    leaguetype.create(op.get_bind(), checkfirst=True)
    op.alter_column('league', 'league_type',
               existing_type=sa.VARCHAR(length=10),
               type_=leaguetype,
               existing_nullable=False,
               postgresql_using=(
                   "CASE league_type"
                   " WHEN '3v3' THEN 'THREE_V_THREE'"
                   " WHEN '6v6' THEN 'SIX_V_SIX'"
                   " ELSE NULL"
                   " END::leaguetype"
               ))


def downgrade():
    # Revert the column back to VARCHAR mapping labels to original short codes
    op.alter_column('league', 'league_type',
               existing_type=sa.Enum('THREE_V_THREE', 'SIX_V_SIX', name='leaguetype'),
               type_=sa.VARCHAR(length=4),
               existing_nullable=False,
               postgresql_using=(
                   "CASE league_type::text"
                   " WHEN 'THREE_V_THREE' THEN '3v3'"
                   " WHEN 'SIX_V_SIX' THEN '6v6'"
                   " ELSE NULL"
                   " END"
               ))
    sa.Enum(name='leaguetype').drop(op.get_bind())

