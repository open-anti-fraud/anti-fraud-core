from collections import deque
from typing import Tuple, Optional, Deque
from unittest.mock import AsyncMock, Mock
from utils.transport_messages.types import IncomingMessageType


def cpu_commands_mock() -> AsyncMock:
    cpu_commands = AsyncMock()

    # TODO mock all interface methods

    return cpu_commands

def video_transport_adapter_mock(
        binary_data: Optional[Deque[Optional[bytes]]] = None,
        video_frames: Optional[Deque[Optional[bytes]]] = None,
        client_message: Optional[Deque[Tuple[IncomingMessageType, Optional[dict]]]] = None
) -> AsyncMock:
    video_transport_adapter = Mock()

    # set async methods
    video_transport_adapter.stop_recording = AsyncMock()
    video_transport_adapter.start_recording = AsyncMock()
    video_transport_adapter.stop_receiving_binary_data = AsyncMock()
    video_transport_adapter.start_receiving_binary_data = AsyncMock()
    video_transport_adapter.recv_binary_data = AsyncMock()
    video_transport_adapter.recv_video_frame = AsyncMock()
    video_transport_adapter.send_message = AsyncMock()
    video_transport_adapter.send_info = AsyncMock()
    video_transport_adapter.send_exception = AsyncMock()
    video_transport_adapter.send_exception_mapping = AsyncMock()
    video_transport_adapter.recv_message = AsyncMock()

    video_transport_adapter.recv_video_frame.side_effect = lambda: video_frames.popleft() if video_frames else None
    video_transport_adapter.recv_binary_data.return_value = lambda: binary_data.popleft() if binary_data else None
    video_transport_adapter.recv_message.side_effect = lambda _: client_message.popleft() if client_message else None

    return video_transport_adapter
