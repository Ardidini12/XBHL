"""add scheduler match models

Revision ID: 526f79a65431
Revises: c0757c482369
Create Date: 2026-02-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '526f79a65431'
down_revision = 'c0757c482369'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create the scheduler_config, scheduler_run, and match tables and an index used by the scheduler feature.
    
    Creates:
    - scheduler_config with UUID primary key, season FK (on delete CASCADE), activity/pausing flags, scheduling fields (days_of_week, start_hour, end_hour, interval_minutes), timestamps, and a unique constraint on season_id.
    - scheduler_run with UUID primary key, FK to scheduler_config and season (both on delete CASCADE), run timestamps, status, match counters, and optional error_message.
    - match with UUID primary key, EA identifiers, timestamps, FKs to season and club (both on delete CASCADE), optional scores and raw_json, and a unique constraint on (ea_match_id, ea_timestamp).
    Also creates a non-unique index on match.ea_match_id.
    """
    op.create_table(
        'scheduler_config',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('season_id', sa.Uuid(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_paused', sa.Boolean(), nullable=False),
        sa.Column('days_of_week', sa.JSON(), nullable=False),
        sa.Column('start_hour', sa.Integer(), nullable=False),
        sa.Column('end_hour', sa.Integer(), nullable=False),
        sa.Column('interval_minutes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['season_id'], ['season.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('season_id'),
    )
    op.create_table(
        'scheduler_run',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('scheduler_config_id', sa.Uuid(), nullable=False),
        sa.Column('season_id', sa.Uuid(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('matches_fetched', sa.Integer(), nullable=False),
        sa.Column('matches_new', sa.Integer(), nullable=False),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['scheduler_config_id'], ['scheduler_config.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['season_id'], ['season.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'match',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('ea_match_id', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column('ea_timestamp', sa.Integer(), nullable=False),
        sa.Column('season_id', sa.Uuid(), nullable=False),
        sa.Column('club_id', sa.Uuid(), nullable=False),
        sa.Column('home_club_ea_id', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
        sa.Column('away_club_ea_id', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
        sa.Column('home_score', sa.Integer(), nullable=True),
        sa.Column('away_score', sa.Integer(), nullable=True),
        sa.Column('raw_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['club_id'], ['club.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['season_id'], ['season.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ea_match_id', 'ea_timestamp', name='uq_match_ea_match_id_timestamp'),
    )
    op.create_index('ix_match_ea_match_id', 'match', ['ea_match_id'], unique=False)


def downgrade():
    """
    Revert the migration by removing the scheduler and match database objects created in upgrade.
    
    This drops the index ix_match_ea_match_id on the match table, then removes the match, scheduler_run, and scheduler_config tables (in that order).
    """
    op.drop_index('ix_match_ea_match_id', table_name='match')
    op.drop_table('match')
    op.drop_table('scheduler_run')
    op.drop_table('scheduler_config')
