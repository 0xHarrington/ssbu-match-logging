"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-03-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create players table
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create characters table
    op.create_table(
        'characters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create stages table
    op.create_table(
        'stages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('datetime', sa.DateTime(), nullable=False),
        sa.Column('shayne_id', sa.Integer(), nullable=False),
        sa.Column('matt_id', sa.Integer(), nullable=False),
        sa.Column('shayne_character_id', sa.Integer(), nullable=False),
        sa.Column('matt_character_id', sa.Integer(), nullable=False),
        sa.Column('winner_id', sa.Integer(), nullable=False),
        sa.Column('stocks_remaining', sa.Integer(), nullable=True),
        sa.Column('stage_id', sa.Integer(), nullable=True),
        sa.Column('match_duration', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['shayne_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['matt_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['winner_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['shayne_character_id'], ['characters.id'], ),
        sa.ForeignKeyConstraint(['matt_character_id'], ['characters.id'], ),
        sa.ForeignKeyConstraint(['stage_id'], ['stages.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Insert initial data
    op.execute("""
        INSERT INTO players (name, created_at)
        VALUES 
        ('Shayne', NOW()),
        ('Matt', NOW())
    """)
    
    # Insert legal stages
    legal_stages = [
        'Battlefield', 'Final Destination', 'Smashville', 'Town & City',
        'Pokemon Stadium 2', 'Kalos Pokemon League', 'Lylat Cruise',
        'Yoshi\'s Story', 'Small Battlefield', 'Hollow Bastion'
    ]
    for stage in legal_stages:
        op.execute(f"""
            INSERT INTO stages (name, created_at)
            VALUES ('{stage}', NOW())
        """)

def downgrade():
    op.drop_table('matches')
    op.drop_table('stages')
    op.drop_table('characters')
    op.drop_table('players') 