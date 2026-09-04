import uuid
from enum import Enum

from sqlalchemy import Column, func, ForeignKey, INTEGER, Sequence, Index
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship

from integration.database import Base
from settings import DEFAULT_AGGREGATE_ENTITY_TOKEN
ser_set_seq = Sequence('ser_set_lock_id_sequence', start=1, increment=1)

class ServiceSettingsModel(Base):
    __tablename__ = 'service_settings'

    id = Column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        default=uuid.uuid4
    )
    settings = Column(postgresql.JSONB(), nullable=False)
    lock_id = Column(
        INTEGER,
        ser_set_seq,
        server_default=ser_set_seq.next_value(),
        unique=True,
        nullable=False
    )


class LastRetentionResultModel(Base):

    class Status(Enum):
        processing = 0
        success = 1
        error = 2

    __tablename__ = 'last_retention_result'

    id = Column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        default=uuid.uuid4
    )
    result = Column(postgresql.JSONB(), nullable=True)
    status = Column(postgresql.SMALLINT, nullable=True)
    planned_retention_date = Column(postgresql.TIMESTAMP(timezone=True), nullable=True)
    actual_retention_date = Column(postgresql.TIMESTAMP(timezone=True), nullable=True)
    last_modified = Column(postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class EndeavorContent(Base):
    __tablename__ = 'endeavor_content'

    id = Column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        default=uuid.uuid4
    )

    endeavor_id = Column(
        postgresql.UUID(as_uuid=True),
        ForeignKey("endeavor.id", ondelete="CASCADE"),
        index=True
    )
    endeavor = relationship("Endeavor", back_populates="content",  single_parent=True)

    parent_id = Column(postgresql.UUID(as_uuid=True))

    type = Column(postgresql.NUMERIC)
    s3_links = Column(postgresql.ARRAY(postgresql.VARCHAR(length=255)), nullable=True)
    info = Column(postgresql.JSONB(), nullable=True)
    exception_info = Column(postgresql.JSONB(), nullable=True)
    creation_date = Column(postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    last_modified = Column(postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class Endeavor(Base):
    __tablename__ = 'endeavor'

    id = Column(
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        default=uuid.uuid4
    )
    content = relationship("EndeavorContent", back_populates="endeavor")


    # fields to remove
    #lightning_pattern = Column(postgresql.JSONB(), nullable=False)
    action_pattern = Column(postgresql.JSONB(), nullable=True)
    liveness_info = Column(postgresql.JSONB(), nullable=True)
    action_info = Column(postgresql.JSONB(), nullable=True)
    lr_s3_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    la_s3_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    lr_s3_ref_image_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    la_s3_ref_image_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    lr_s3_ref_template_bsm_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    la_s3_ref_template_bsm_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    # fields to remove

    external_link = Column(postgresql.VARCHAR(length=100), nullable=True)
    aggregate_entity_id = Column(
        postgresql.UUID(as_uuid=True),
        nullable=False,
        server_default=DEFAULT_AGGREGATE_ENTITY_TOKEN
    )

    creation_date = Column(postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    last_modified = Column(postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


Index("external_link_index", Endeavor.external_link)
