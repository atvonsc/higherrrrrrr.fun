"""modify tweet model

Revision ID: 3cc42e390f88
Revises: 872eb2a3ba11
Create Date: 2024-12-17 22:39:54.216310

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3cc42e390f88'
down_revision = '872eb2a3ba11'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('tweets', sa.Column('output', sa.Text(), nullable=False))
    op.add_column('tweets', sa.Column('in_reply_to', sa.String(length=255), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('tweets', 'in_reply_to')
    op.drop_column('tweets', 'output')
    # ### end Alembic commands ###
