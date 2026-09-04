import datetime
import uuid
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, RootModel
from settings import MAX_ACTION_PATTERN_LENGTH, MIN_ACTION_PATTERN_LENGTH


class SDPType(str, Enum):
    offer = "offer"
    answer = "answer"


class ExternalLink(BaseModel):
    external_link: Optional[str] = Field(default=None)


class EndeavorCreationInfo(ExternalLink):
    pass


class Action(str, Enum):
    up = "up"
    left = "left"
    right = "right"
    closer = "closer"
    farther = "farther"


class ActionResultInfo(BaseModel):
    pattern: Action
    result: bool
    photo_link: Optional[str] = None


class MotionControlInfo(RootModel[List[ActionResultInfo]]):
    root: List[ActionResultInfo] = Field(
        default=None,
        max_length=MAX_ACTION_PATTERN_LENGTH,
        min_length=MIN_ACTION_PATTERN_LENGTH
    )


class ActionPattern(BaseModel):
    pattern: List[Action] = Field(default=None,
                                  max_length=MAX_ACTION_PATTERN_LENGTH,
                                  min_length=MIN_ACTION_PATTERN_LENGTH)


class EndeavorIdResult(BaseModel):
    endeavor_id: uuid.UUID


class Answer(BaseModel):
    sdp: str
    type: SDPType


class Offer(Answer, EndeavorIdResult):
    pass

class SortOrder(Enum):
    asc = "asc"
    desc = "desc"

class EndeavorCreate(EndeavorIdResult):
    external_link: Optional[str] = None
    aggregate_entity_id: uuid.UUID


class BSM(BaseModel):
    blob: str
    format: str
    dtype: str
    shape: List[int]

class ContentFile(BaseModel):
    s3_link: str
    raw_data_in_base64: Optional[str] = None

class EndeavorContent(BaseModel):
    id: uuid.UUID
    files: List[ContentFile]
    type: int
    parent_id: Optional[uuid.UUID] = None
    info: Optional[dict] = None
    exception_info: Optional[dict] = None
    creation_date: datetime.datetime
    last_modified: datetime.datetime

class EndeavorInfo(BaseModel):
    id: uuid.UUID
    external_link: Optional[str] = None
    content: List[EndeavorContent]
    creation_date: datetime.datetime
    last_modified: datetime.datetime


class PaginatedInfoInput(BaseModel):
    page: int
    page_size: int
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None

class EndeavorPaginatedInfo(BaseModel):
    page: int
    page_size: int
    total_count: int
    endeavor_list: List[EndeavorInfo]


class MatchingInfo(BaseModel):
    distance: int
    fa_r: float
    fr_r: float
    score: float


class PatternResult(BaseModel):
    pattern: Action
    result: bool


class LAVideoSaveInfo(ActionPattern):
    pattern_result: List[PatternResult] = Field(default=None,
                                                max_length=MAX_ACTION_PATTERN_LENGTH,
                                                min_length=MIN_ACTION_PATTERN_LENGTH)


class RetentionDimension(str, Enum):
    days = "days"
    seconds = "seconds"
    minutes = "minutes"
    hours = "hours"
    weeks = "weeks"


class RetentionSettingsUpdate(BaseModel):
    enable: Optional[bool] = None
    content_retention: Optional[int] = Field(ge=1, default=None)
    content_retention_dimension: Optional[RetentionDimension] = None
    execution_cron: Optional[str] = None


class ServiceSettingsUpdate(BaseModel):
    retention_settings: RetentionSettingsUpdate


class RetentionSettings(BaseModel):
    enable: bool
    content_retention: int = Field(ge=1)
    content_retention_dimension: RetentionDimension
    execution_cron: str


class ServiceSettings(BaseModel):
    retention_settings: RetentionSettings


class RetentionExceptionInfo(BaseModel):
    type: str
    message: str
    traceback: str


class RetentionData(BaseModel):
    exception: Optional[RetentionExceptionInfo] = None
