"""reformat_json

Revision ID: 0ab056de9369
Revises: 668035509e79
Create Date: 2024-02-16 10:34:34.484489

"""
import json
from math import trunc

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0ab056de9369'
down_revision = '668035509e79'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    t_endeavor = sa.Table(
        'endeavor',
        sa.MetaData(),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('liveness_info', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    results = connection.execute(sa.select(
        t_endeavor.c.id,
        t_endeavor.c.liveness_info,
    ).where(t_endeavor.c.liveness_info.isnot(None))).fetchall()

    for id_, liveness_info in results:

        try:
            connection.execute(t_endeavor.update().where(t_endeavor.c.id == id_).values(
                liveness_info={"liveness_reflection_result": {
                    "confidence": liveness_info["score"] / 100,
                    "value": liveness_info["value"] == "real",
                    "info": None
                }}
            ))
        except KeyError:
            print(f"Convert error: {liveness_info, id_}")
            connection.execute(t_endeavor.update().where(t_endeavor.c.id == id_).values(
                liveness_info={"liveness_reflection_result": {
                    "confidence": 0.99,
                    "value": True,
                    "info": None
                }}
            ))


def downgrade() -> None:
    connection = op.get_bind()

    t_endeavor = sa.Table(
        'endeavor',
        sa.MetaData(),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('liveness_info', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    results = connection.execute(sa.select(
        t_endeavor.c.id,
        t_endeavor.c.liveness_info,
    ).where(t_endeavor.c.liveness_info.isnot(None))).fetchall()

    for id_, liveness_info in results:
        try:
            new_liveness_info = liveness_info["liveness_reflection_result"]
        except KeyError:
            print(f"Convert error: {liveness_info, id_}")
            continue

        connection.execute(t_endeavor.update().where(t_endeavor.c.id == id_).values(
            liveness_info={
                "score": trunc(new_liveness_info["confidence"] * 100),
                "value": "real" if new_liveness_info["value"] else "false"
            }
        ))
