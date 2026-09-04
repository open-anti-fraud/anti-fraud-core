import asyncio
import datetime
from dataclasses import dataclass
from enum import Enum
from typing import Tuple, Optional, Dict, Any

from core.business_logic.types import PixelFormat


class CommandType(Enum):
    frame_to_image = 0
    video_to_frames = 1
    frame_to_video = 2
    packet_to_frames_and_video = 3
    packet_to_video = 4

@dataclass
class SessionContext:
    session_id: str
    command_type: CommandType
    init_date: datetime.datetime


class NumpyDataType(Enum):
    uint8 = "uint8"
    uint16 = "uint16"
    float32 = "float32"


@dataclass
class Frame:
    data: bytes
    data_type: NumpyDataType
    shape: Tuple[int, int]
    pixel_format: PixelFormat
    exif: Optional[Dict] = None


# class VariableByRefSyncPrimitive[T]:
#     def __init__(self):
#         self._condition = asyncio.Condition()
#         self._value = None
#
#     def set_variable(self, value: T):
#         self._value = value
#         self._condition.acquire()
#
#     async def get_variable(self) -> T:
#         try:
#             await asyncio.wait_for(self._condition.wait(), timeout=1)
#             return self._value
#         finally:
#             self._condition.release()
