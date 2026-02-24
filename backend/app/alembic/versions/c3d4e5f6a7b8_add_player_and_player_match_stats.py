"""add player and player_match_stats tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'player',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('ea_player_id', sa.String(length=64), nullable=False),
        sa.Column('gamertag', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ea_player_id'),
    )
    op.create_index('ix_player_ea_player_id', 'player', ['ea_player_id'], unique=True)
    op.create_index('ix_player_gamertag', 'player', ['gamertag'], unique=False)

    op.create_table(
        'player_match_stats',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('player_id', sa.Uuid(), nullable=False),
        sa.Column('ea_player_id', sa.String(length=64), nullable=False),
        sa.Column('ea_match_id', sa.String(length=64), nullable=False),
        sa.Column('ea_timestamp', sa.Integer(), nullable=True),
        sa.Column('match_id', sa.Uuid(), nullable=True),
        sa.Column('stat_class', sa.Integer(), nullable=True),
        sa.Column('glbrksavepct', sa.Float(), nullable=True),
        sa.Column('glbrksaves', sa.Integer(), nullable=True),
        sa.Column('glbrkshots', sa.Integer(), nullable=True),
        sa.Column('gldsaves', sa.Integer(), nullable=True),
        sa.Column('glga', sa.Integer(), nullable=True),
        sa.Column('glgaa', sa.Float(), nullable=True),
        sa.Column('glpensavepct', sa.Float(), nullable=True),
        sa.Column('glpensaves', sa.Integer(), nullable=True),
        sa.Column('glpenshots', sa.Integer(), nullable=True),
        sa.Column('glpkclearzone', sa.Integer(), nullable=True),
        sa.Column('glpokechecks', sa.Integer(), nullable=True),
        sa.Column('glsavepct', sa.Float(), nullable=True),
        sa.Column('glsaves', sa.Integer(), nullable=True),
        sa.Column('glshots', sa.Integer(), nullable=True),
        sa.Column('glsoperiods', sa.Integer(), nullable=True),
        sa.Column('is_guest', sa.Integer(), nullable=True),
        sa.Column('opponent_club_id', sa.String(length=64), nullable=True),
        sa.Column('opponent_score', sa.Integer(), nullable=True),
        sa.Column('opponent_team_id', sa.String(length=64), nullable=True),
        sa.Column('player_dnf', sa.Integer(), nullable=True),
        sa.Column('player_level', sa.Integer(), nullable=True),
        sa.Column('p_nhl_online_game_type', sa.String(length=32), nullable=True),
        sa.Column('position', sa.String(length=64), nullable=True),
        sa.Column('pos_sorted', sa.Integer(), nullable=True),
        sa.Column('rating_defense', sa.Float(), nullable=True),
        sa.Column('rating_offense', sa.Float(), nullable=True),
        sa.Column('rating_teamplay', sa.Float(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('skassists', sa.Integer(), nullable=True),
        sa.Column('skbs', sa.Integer(), nullable=True),
        sa.Column('skdeflections', sa.Integer(), nullable=True),
        sa.Column('skfol', sa.Integer(), nullable=True),
        sa.Column('skfopct', sa.Float(), nullable=True),
        sa.Column('skfow', sa.Integer(), nullable=True),
        sa.Column('skgiveaways', sa.Integer(), nullable=True),
        sa.Column('skgoals', sa.Integer(), nullable=True),
        sa.Column('skgwg', sa.Integer(), nullable=True),
        sa.Column('skhits', sa.Integer(), nullable=True),
        sa.Column('skinterceptions', sa.Integer(), nullable=True),
        sa.Column('skpassattempts', sa.Integer(), nullable=True),
        sa.Column('skpasses', sa.Integer(), nullable=True),
        sa.Column('skpasspct', sa.Float(), nullable=True),
        sa.Column('skpenaltiesdrawn', sa.Integer(), nullable=True),
        sa.Column('skpim', sa.Integer(), nullable=True),
        sa.Column('skpkclearzone', sa.Integer(), nullable=True),
        sa.Column('skplusmin', sa.Integer(), nullable=True),
        sa.Column('skpossession', sa.Integer(), nullable=True),
        sa.Column('skppg', sa.Integer(), nullable=True),
        sa.Column('sksaucerpasses', sa.Integer(), nullable=True),
        sa.Column('skshg', sa.Integer(), nullable=True),
        sa.Column('skshotattempts', sa.Integer(), nullable=True),
        sa.Column('skshotonnetpct', sa.Float(), nullable=True),
        sa.Column('skshotpct', sa.Float(), nullable=True),
        sa.Column('skshots', sa.Integer(), nullable=True),
        sa.Column('sktakeaways', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.String(length=64), nullable=True),
        sa.Column('team_side', sa.Integer(), nullable=True),
        sa.Column('toi', sa.Integer(), nullable=True),
        sa.Column('toiseconds', sa.Integer(), nullable=True),
        sa.Column('client_platform', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['match_id'], ['match.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['player.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ea_player_id', 'ea_match_id', name='uq_player_match_stats_player_match'),
    )
    op.create_index('ix_player_match_stats_ea_player_id', 'player_match_stats', ['ea_player_id'], unique=False)
    op.create_index('ix_player_match_stats_ea_match_id', 'player_match_stats', ['ea_match_id'], unique=False)
    op.create_index('ix_player_match_stats_player_id', 'player_match_stats', ['player_id'], unique=False)
    op.create_index('ix_player_match_stats_match_id', 'player_match_stats', ['match_id'], unique=False)


def downgrade():
    op.drop_table('player_match_stats')
    op.drop_table('player')
