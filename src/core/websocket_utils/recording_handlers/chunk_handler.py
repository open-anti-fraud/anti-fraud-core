import asyncio
import logging
import uuid
from io import BytesIO
from typing import Optional, Tuple

import settings
from core.business_logic.types import VideoContainer
from core.websocket_utils.recording_handlers.interface import RecordingInterface
from core.websocket_utils.types import WebSocketContext
from core.websocket_utils.utils import check_start_video_chunk
from integration.metrics import VrMetrics
from integration.metrics.manager import get_metrics_manager
from utils.exceptions import ComponentVideoChunkDataSendTimeout

metrics_manager = get_metrics_manager()


class ChunkRecordingHandler(RecordingInterface):
    @staticmethod
    def __name__():
        # override ABCMeta class name
        return "ChunkRecordingHandler"

    def __init__(
            self,
            socket_context: WebSocketContext,
            logger: logging.Logger,

            video_type: str,
            container: VideoContainer,

            raw_frames_queue: Optional[asyncio.Queue] = None
    ):
        self.socket_context = socket_context
        self.logger = logger

        # raw frames result queue. If none expecting that decoding is not needed
        self.raw_frames_queue = raw_frames_queue
        self.container = container

        self.session_id = f"{self.socket_context.endeavor_id}-{video_type}-{uuid.uuid4()}"
        self._stop_recording_signal = False

    def stop_recording(self):
        self._stop_recording_signal = True

    async def recording_task(self, start_data: Optional[bytes] = None) -> Tuple[Optional[bytes], Optional[Exception]]:
        temp_video = BytesIO()

        # disable decoding in time by choosing dummy decoding context manager
        if self.raw_frames_queue:
            decoding_context_manager = self.socket_context.cpu_commands.decode_video_chunks_to_frames
        else:
            decoding_context_manager = self.socket_context.cpu_commands.dummy_decode_video_chunks_to_frames

        async with decoding_context_manager(self.session_id) as work_function:
            try:
                check_chunk = True

                while True:
                    if start_data is None:
                        try:
                            video_chunk = await asyncio.wait_for(
                                self.socket_context.websocket.receive_bytes(),
                                timeout=settings.WEBSOCKET_TIMEOUT
                            )
                        except asyncio.TimeoutError as ex:
                            raise ComponentVideoChunkDataSendTimeout() from ex
                    else:
                        video_chunk = start_data
                        start_data = None

                    metrics_manager.update_average_metric(VrMetrics.WebsocketAverageVideoChunkSize.value, len(video_chunk))

                    # recording abort if external signal comes
                    # OR
                    # hexadecimal number 4 in 1 byte in big endian format #4.to_bytes(1, 'big')
                    # recording abort if 4 comes
                    if self._stop_recording_signal or video_chunk == b'\x04':
                        return None, None

                    # hexadecimal number 5 in 1 byte in big endian format #5.to_bytes(1, 'big')
                    # recording ended if 5 comes
                    if video_chunk == b'\x05':
                        break

                    temp_video.write(video_chunk)

                    # check start video chunk for validity after all signal checks
                    if check_chunk:
                        check_chunk = False
                        result = check_start_video_chunk(video_chunk, self.container)

                        if not result:
                            raise Exception("Invalid video data received")

                    if self.raw_frames_queue:
                        frames = await work_function(video_chunk)

                        # send decoded frames to upper level
                        for frame in frames:
                            await self.raw_frames_queue.put(frame)

                return temp_video.getvalue(), None
            except Exception as ex:
                return temp_video.getvalue(), ex
            finally:
                temp_video.close()

