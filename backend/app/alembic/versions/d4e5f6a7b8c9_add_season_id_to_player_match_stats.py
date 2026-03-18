"""add season_id to player_match_stats

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-18 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    # Add season_id column (nullable FK to season.id)
    op.add_column(
        'player_match_stats',
        sa.Column('season_id', sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        'fk_player_match_stats_season_id',
        'player_match_stats',
        'season',
        ['season_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_index(
        'ix_player_match_stats_season_id',
        'player_match_stats',
        ['season_id'],
        unique=False,
    )

    # Backfill season_id from the linked match row
    op.execute(
        """
        UPDATE player_match_stats pms
        SET season_id = m.season_id
        FROM match m
        WHERE pms.match_id = m.id
          AND pms.season_id IS NULL
        """
    )


def downgrade():
    op.drop_index('ix_player_match_stats_season_id', table_name='player_match_stats')
    op.drop_constraint('fk_player_match_stats_season_id', 'player_match_stats', type_='foreignkey')
    op.drop_column('player_match_stats', 'season_id')
