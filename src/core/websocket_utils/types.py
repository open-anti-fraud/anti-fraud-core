import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Tuple, Optional

from starlette.websockets import WebSocket

from core.business_logic.interface.cpu_commands_interface import CPUCommandsInterface
from core.business_logic.interface.video_transport_adapter import TransportCapability
from core.business_logic.types import VideoContainer, VideoCodec
from core.business_logic.types  import PixelFormat


# Interface for brake circular imports
class WebSocketConnectionHandlerInterface(ABC):
    @abstractmethod
    def start_recording(
            self,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
            video_type: str,
            raw_frame_needed: bool,
    ):
        pass

    @abstractmethod
    def get_transport_capabilities(self) -> Optional[TransportCapability]:
        raise NotImplemented()

    @abstractmethod
    def stop_recording(self):
        raise NotImplemented()

    @abstractmethod
    def start_binary_transfer(self):
        raise NotImplemented()

    @abstractmethod
    def stop_binary_transfer(self):
        raise NotImplemented()

@dataclass
class WebSocketContext:
    endeavor_id: uuid.UUID
    websocket: WebSocket
    cpu_commands: CPUCommandsInterface
