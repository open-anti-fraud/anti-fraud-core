import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Tuple, List

from pydantic import BaseModel

from base_types import MotionControlInfo
from integration.object_storage.models import S3Object
from utils.exceptions import form_content_exception_info


class VideoContainer(Enum):
    mp4 = 0
    webm = 1

class VideoCodec(Enum):
    vp8 = 0
    vp9 = 1
    h264 = 2

class ContentType(Enum):
    motion_control_video = 1
    blank_video = 2
    reference_frame = 3
    reference_frame_demo = 4
    motion_control_frame = 5
    verification_frame = 6

class PixelFormat(Enum):
    yuv420p = "yuv420p"
    yuv422p = "yuv422p"
    yuvj420p = "yuvj420p"
    # abgr = "abgr"
    # argb = "argb"
    bayer_bggr8 = "bayer_bggr8"
    bayer_gbrg8 = "bayer_gbrg8"
    bayer_grbg8 = "bayer_grbg8"
    bayer_rggb8 = "bayer_rggb8"
    bayer_bggr16le = "bayer_bggr16le"
    bayer_bggr16be = "bayer_bggr16be"
    bayer_gbrg16le = "bayer_gbrg16le"
    bayer_gbrg16be = "bayer_gbrg16be"
    bayer_grbg16le = "bayer_grbg16le"
    bayer_grbg16be = "bayer_grbg16be"
    bayer_rggb16le = "bayer_rggb16le"
    bayer_rggb16be = "bayer_rggb16be"
    bgr24 = "bgr24"
    bgr8 = "bgr8"
    # bgra = "bgra"
    # gbrapf32be = "gbrapf32be"
    # gbrapf32le = "gbrapf32le"
    gbrp = "gbrp"
    gbrp10be = "gbrp10be"
    gbrp10le = "gbrp10le"
    gbrp12be = "gbrp12be"
    gbrp12le = "gbrp12le"
    gbrp14be = "gbrp14be"
    gbrp14le = "gbrp14le"
    gbrp16be = "gbrp16be"
    gbrp16le = "gbrp16le"
    gbrpf32be = "gbrpf32be"
    gbrpf32le = "gbrpf32le"
    # gray = "gray"
    # gray16be = "gray16be"
    # gray16le = "gray16le"
    # gray8 = "gray8"
    # grayf32be = "grayf32be"
    # grayf32le = "grayf32le"
    rgb24 = "rgb24"
    rgb48be = "rgb48be"
    rgb48le = "rgb48le"
    rgb8 = "rgb8"
    rgba = "rgba"
    rgba64be = "rgba64be"
    rgba64le = "rgba64le"
    # yuv444p = "yuv444p"
    # yuv444p16be = "yuv444p16be"
    # yuv444p16le = "yuv444p16le"
    # yuva444p16be = "yuva444p16be"
    # yuva444p16le = "yuva444p16le"
    # yuvj444p = "yuvj444p"
    yuyv422 = "yuyv422"


@dataclass
class VideoResult:
    video_bytes: Optional[bytes]
    recording_aborted: bool
    transport_exception: bool
    exception: Optional[Exception]

@dataclass
class ReferenceFrameInfo:
    frame: bytes
    frame_extension: str
    template: Optional[bytes]

@dataclass
class FileData:
    data: bytes
    extension: str

    # Optional s3 class name. Specify if you need full control of s3 file link
    s3_class: Optional[S3Object] = None
    # Optional content name. If specified will be used as s3 file name.
    name: Optional[str] = None

@dataclass
class ContentInfo:
    files: List[FileData]
    type: ContentType
    #reference_frame: Optional[ReferenceFrameInfo] = None
    parent_id: Optional[uuid.UUID] = None
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    info: Optional[dict] = None
    exception_info: Optional[dict] = None
    original_exception: Optional[Exception] = None

    def fill_exception_info(self, exception: Exception):
        self.original_exception = exception
        self.exception_info = form_content_exception_info(exception)


class VideoInfoMCWrapper:
    mc_info_key = "motion_control_result"

    def __init__(self, content_info: ContentInfo):
        self.original_info = content_info

    @property
    def result(self) -> MotionControlInfo:
        return MotionControlInfo.model_validate(self.original_info.info[self.mc_info_key])

    @result.setter
    def result(self, value: MotionControlInfo):
        if self.original_info.info is None:
            self.original_info.info = {}

        self.original_info.info[self.mc_info_key] = value.model_dump()


#=============== Incoming messages body types =================

class ContentHandleRequest(BaseModel):
    type: ContentType
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    content_context_data: Optional[dict] = None

class VideoRecordContextData(BaseModel):
    params: dict = field(default_factory=dict)
    container: VideoContainer
    codec: VideoCodec
    #capture_reference_frame: bool
    pixel_format: Optional[PixelFormat] = None
    width_x_height: Optional[Tuple[int, int]] = None
    bitrate: Optional[int] = None
    fps: Optional[int] = None
