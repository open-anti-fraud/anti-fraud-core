import asyncio
from typing import Optional, Tuple

from starlette.websockets import WebSocket

from core.business_logic.interface.video_transport_adapter import (VideoTransportAdapterInterface,
                                                                   TransportCapability,
                                                                   CapabilityInfo)

from core.business_logic.interface.cpu_commands_interface import VideoContainer, VideoCodec
from core.websocket_utils.types import WebSocketConnectionHandlerInterface
from core.business_logic.types  import PixelFormat


class WebSocketTransportAdapter(VideoTransportAdapterInterface):
    @property
    def capability(self) -> Optional[TransportCapability]:
        return self.websocket_connection_handler.get_transport_capabilities()

    def __init__(self,
                 websocket_connection: WebSocket,
                 websocket_connection_handler: WebSocketConnectionHandlerInterface):
        super().__init__()
        self.websocket_connection = websocket_connection
        self.websocket_connection_handler = websocket_connection_handler
        self.frame_queue = asyncio.Queue()
        self.binary_data_queue = asyncio.Queue()
        self.message_queue = asyncio.Queue()

    async def _channel_send_message(self, message: str):
        await self.websocket_connection.send_text(message)

    async def _channel_recv_message(self) -> str:
        return await self.message_queue.get()

    async def recv_video_frame(self) -> bytes:
        return await self.frame_queue.get()

    async def recv_binary_data(self) -> bytes:
        return await self.binary_data_queue.get()

    async def start_receiving_binary_data(self):
        self.websocket_connection_handler.start_binary_transfer()

    async def stop_receiving_binary_data(self):
        self.websocket_connection_handler.stop_binary_transfer()

    async def start_recording(self,
                              container: VideoContainer,
                              codec: VideoCodec,
                              pixel_format: PixelFormat,
                              width_x_height: Tuple[int, int],
                              bitrate: int,
                              fps: int,
                              video_type: str,
                              raw_frames_needed: Optional[bool] = True):
        self.websocket_connection_handler.start_recording(
            container,
            codec,
            pixel_format,
            width_x_height,
            bitrate,
            fps,
            video_type,
            raw_frames_needed
        )

    async def stop_recording(self):
        self.websocket_connection_handler.stop_recording()