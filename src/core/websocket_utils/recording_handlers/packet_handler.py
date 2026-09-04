import asyncio
import logging
import uuid
from io import BytesIO
from typing import Optional, Tuple

import settings
from core.business_logic.types import VideoContainer, VideoCodec
from core.websocket_utils.types import WebSocketContext
from core.websocket_utils.recording_handlers.interface import RecordingInterface
from core.business_logic.types  import PixelFormat
from integration.metrics import VrMetrics
from integration.metrics.manager import get_metrics_manager
from utils.exceptions import ComponentPacketDataSendTimeout

metrics_manager = get_metrics_manager()


class PacketRecordingHandler(RecordingInterface):
    @staticmethod
    def __name__():
        # override ABCMeta class name
        return "PacketRecordingHandler"

    def __init__(
            self,
            socket_context: WebSocketContext,
            logger: logging.Logger,

            video_type: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,

            raw_frames_queue: Optional[asyncio.Queue] = None
    ):
        self.socket_context = socket_context
        self.logger = logger

        # raw frames result queue. If none expecting that decoding is not needed
        self.raw_frames_queue = raw_frames_queue
        self.container = container
        self.codec = codec
        self.pixel_format = pixel_format
        self.width_x_height = width_x_height
        self.bitrate = bitrate
        self.fps = fps
        self.session_id = f"{self.socket_context.endeavor_id}-{video_type}-{uuid.uuid4()}"
        self._stop_recording_signal = False
        # store packets in variable in case of packet processing error
        # file header - "0x57 6F 77 49 6E 76 43 68 75 6E 6B 75 73"
        # each packet start with its size stored in 4 big endian order octets
        self.temporary_packets_storage = BytesIO(b"WowInvChunkus")
        self.temporary_packets_storage.seek(13)

    def stop_recording(self):
        self._stop_recording_signal = True

    async def recording_task(
            self,
            start_data: Optional[bytes] = None
    ) -> Tuple[Optional[bytes], Optional[Exception]]:

        # disable decoding in time by choosing dummy decoding context manager
        if self.raw_frames_queue:
            decoding_context_manager = self.socket_context.cpu_commands.cast_packets_to_frames_and_video
        else:
            decoding_context_manager = self.socket_context.cpu_commands.cast_packets_to_video

        async with decoding_context_manager(
                self.session_id,
                self.container,
                self.codec,
                self.pixel_format,
                self.width_x_height,
                self.bitrate,
                self.fps
        ) as result_tuple:
            work_function, result_list = result_tuple
            packet_buffer = []
            dump_buffer = False

            try:
                while True:
                    if start_data is None:
                        try:
                            packet = await asyncio.wait_for(
                                self.socket_context.websocket.receive_bytes(),
                                timeout=settings.WEBSOCKET_TIMEOUT
                            )
                        except asyncio.TimeoutError as ex:
                            raise ComponentPacketDataSendTimeout() from ex
                    else:
                        packet = start_data
                        start_data = None

                    metrics_manager.update_average_metric(VrMetrics.WebsocketAverageVideoChunkSize.value, len(packet))

                    # recording abort if external signal comes
                    # OR
                    # hexadecimal number 4 in 1 byte in big endian format #4.to_bytes(1, 'big')
                    # recording abort if 4 comes
                    if self._stop_recording_signal or packet == b'\x04':
                        return None, None
                    # hexadecimal number 5 in 1 byte in big endian format #5.to_bytes(1, 'big')
                    # recording ended if 5 comes
                    elif packet == b'\x05':
                        dump_buffer = True
                    else:
                        self.temporary_packets_storage.write(
                            len(packet).to_bytes(4, "big") + packet
                        )
                        packet_buffer.append(packet)

                    if (len(packet_buffer) >= settings.PACKET_BUFFER_SIZE or dump_buffer) and len(packet_buffer) != 0:
                        if self.raw_frames_queue:
                            frames = await work_function(packet_buffer)

                            # send decoded frames to upper level
                            for frame in frames:
                                await self.raw_frames_queue.put(frame)
                        else:
                            await work_function(packet_buffer)

                        packet_buffer = []

                    # stop cycle if buffer was dumped which means recording ended
                    if dump_buffer:
                        break
            except Exception as ex:
                return self.temporary_packets_storage.getvalue(), ex
            finally:
                self.temporary_packets_storage.close()

        return result_list[0], None