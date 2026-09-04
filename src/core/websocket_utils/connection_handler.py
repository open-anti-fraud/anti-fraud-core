import asyncio
import logging
from asyncio import CancelledError
from typing import Optional, Tuple, MutableMapping

from starlette.types import Message
from starlette.websockets import WebSocketDisconnect
from websockets import ConnectionClosed

import settings
from core.business_logic.interface.video_transport_adapter import TransportCapability, CapabilityInfo
from core.business_logic.types import PixelFormat
from core.business_logic.types import VideoResult, VideoContainer, VideoCodec
from core.websocket_utils.recording_handlers.chunk_handler import ChunkRecordingHandler
from core.websocket_utils.recording_handlers.interface import RecordingInterface
from core.websocket_utils.recording_handlers.packet_handler import PacketRecordingHandler
from core.websocket_utils.transport_adapter import WebSocketTransportAdapter
from core.websocket_utils.transport_messages import IncomingTransportMessages
from core.websocket_utils.types import WebSocketContext, WebSocketConnectionHandlerInterface
from utils.correlation import BASE_LOGGING_FORMAT, get_logger, DEBUG
from utils.exceptions import (WebSocketTimeout, ComponentBinaryDataSendTimeout,
                              ComponentTimeouts, ComponentMessageSendTimeout, NoVideoTransferred)
from utils.transport_messages.processor import MessageProcessor


class WebSocketConnectionHandler(WebSocketConnectionHandlerInterface):
    transport_exceptions = (
        ComponentTimeouts,
        CancelledError,
        WebSocketTimeout,
        WebSocketDisconnect,
        ConnectionClosed
    )

    def __init__(self, context: WebSocketContext):
        self.socket_context = context
        self.transport_adapter: Optional[WebSocketTransportAdapter] = None

        # binary transfer vars
        self._binary_transfer = False

        # decoding vars
        self._recording_start: bool = False
        self._raw_frames_needed: bool = False

        # default recording class is Chunks for backwards component compatibility
        self._recorder_handler_class = ChunkRecordingHandler
        self._recorder_handler_instance: Optional[RecordingInterface] = None

        # init logger for transport level of websocket connection
        formatter = logging.Formatter(
            f'{BASE_LOGGING_FORMAT}|{self.socket_context.endeavor_id}|TRANSPORT|%(message)s'
        )
        self.logger = get_logger(
            __name__,
            formatter
        )

        self._invalid_message_log = 0

    def get_transport_capabilities(self) -> Optional[TransportCapability]:
        match self._recorder_handler_class.__name__:
            case ChunkRecordingHandler.__name__:
                return TransportCapability(
                    unable_decode_raw_frames = CapabilityInfo(
                        containers = {VideoContainer.mp4, }
                    )
                )
            case PacketRecordingHandler.__name__:
                return None
            case _:
                raise Exception("Unknown capability for this recording handler")

    def add_transport_adapter(self, transport_adapter: WebSocketTransportAdapter):
        self.transport_adapter = transport_adapter

    def start_recording(
            self,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
            video_type: str,
            raw_frame_needed: bool
    ):
        self._recording_start = True

        if self._recorder_handler_class == ChunkRecordingHandler:
            self._recorder_handler_instance = ChunkRecordingHandler(
                self.socket_context,
                self.logger,
                video_type,
                container,
                self.transport_adapter.frame_queue if raw_frame_needed else None
            )
        elif self._recorder_handler_class == PacketRecordingHandler:
            self._recorder_handler_instance =  PacketRecordingHandler(
                self.socket_context,
                self.logger,
                video_type,
                container,
                codec,
                pixel_format,
                width_x_height,
                bitrate,
                fps,
                self.transport_adapter.frame_queue if raw_frame_needed else None
            )
        else:
            raise Exception(
                f"Recording class not specified or not known."
                f" Current recording class value: {self._recorder_handler_class}"
            )

    def stop_recording(self):
        self._recording_start = False
        self._recorder_handler_instance.stop_recording()

    def start_binary_transfer(self):
        self._binary_transfer = True

    def stop_binary_transfer(self):
        self._binary_transfer = False

    def _handle_ws_message(self, message: MutableMapping, data: str):
        try:
            message = message[data]
            # reset log message counter if correct message type received
            self._invalid_message_log = 0
            return message
        except KeyError:
            # log invalid message type only certain number and suppress other ot DEBUG mode enabled
            if self._invalid_message_log <= 3 or DEBUG:
                self.logger.warning(f"Invalid message type received. Expected {data} message")
                self._invalid_message_log += 1

            return None

    async def handle(self):
        prev_message: Optional[Message] = None

        if self.transport_adapter is None:
            raise Exception("Specify transport adapter first")

        while True:
            try:
                if prev_message is None:
                    try:
                        message = await asyncio.wait_for(
                            self.socket_context.websocket.receive(),
                            timeout=settings.WEBSOCKET_TIMEOUT
                        )
                    except asyncio.TimeoutError as ex:
                        raise ComponentMessageSendTimeout() from ex
                else:
                    message = prev_message
                    prev_message = None

                # Copy from websocket source.
                # Raise exception on disconnect.
                if message["type"] == "websocket.disconnect":
                    raise WebSocketDisconnect(message["code"], message.get("reason"))

                if not (self._recording_start or self._binary_transfer):
                    message_text = self._handle_ws_message(message, "text")
                    # reset handling cycle if invalid message occurred
                    if message_text is None:
                        continue

                    if message_text == IncomingTransportMessages.chunks_recording_mode:
                        self._recorder_handler_class = ChunkRecordingHandler
                    elif message_text == IncomingTransportMessages.packets_recording_mode:
                        self._recorder_handler_class = PacketRecordingHandler
                    else:
                        await self.transport_adapter.message_queue.put(message_text)
                elif self._binary_transfer:
                    message_data = self._handle_ws_message(message, "bytes")
                    # reset handling cycle if invalid message occurred
                    if message_data is None:
                        continue

                    # handle situation when frontend stop binary transfer immediately
                    if message_data == b'\x05':
                        self.transport_adapter.binary_data_queue.put_nowait(None)
                        self._binary_transfer = False
                    else:
                        # pass received message to business because this task can receive message before know about binary transfer start
                        self.transport_adapter.binary_data_queue.put_nowait(message_data)

                    # step into binary transferring cycle
                    while self._binary_transfer:
                        try:
                            packed_binary_message = await asyncio.wait_for(
                                self.socket_context.websocket.receive(),
                                timeout=settings.WEBSOCKET_TIMEOUT
                            )
                        except asyncio.TimeoutError as ex:
                            raise ComponentBinaryDataSendTimeout() from ex

                        try:
                            binary_data = packed_binary_message["bytes"]
                        except KeyError:
                            # pass received message to next handle cycle if binary transfer disabled
                            if not self._binary_transfer:
                                prev_message = packed_binary_message
                                break
                            else:
                                raise

                        # handle situation where business send signal to stop transferring bytes while cycle waiting for next message
                        if not self._binary_transfer:
                            self.logger.warning("Skip handling binary transfer message because of bl signal")
                            break

                        if binary_data == b'\x05':
                            self.transport_adapter.binary_data_queue.put_nowait(None)
                            self._binary_transfer = False
                            break

                        self.transport_adapter.binary_data_queue.put_nowait(binary_data)

                elif self._recording_start:
                    video_bytes = None
                    exception = None
                    recording_aborted = False
                    transport_exception = False

                    # step into recording circle
                    try:
                        message_data = self._handle_ws_message(message, "bytes")
                        # reset handling cycle if invalid message occurred
                        if message_data is None:
                            continue

                        # pass received message to video recorder because this task can receive message before know about recording start
                        video_bytes, recording_exception = await self._recorder_handler_instance.recording_task(
                            start_data=message_data
                        )
                        if recording_exception is not None:
                            raise recording_exception
                        elif video_bytes is not None and len(video_bytes) == 0:
                            raise NoVideoTransferred()
                        else:
                            exception = None
                            recording_aborted = video_bytes is None
                    except self.transport_exceptions:
                        transport_exception = True
                        raise
                    except Exception as ex:
                        exception = ex
                        raise
                    finally:
                        self.transport_adapter.save_video_result(VideoResult(
                            video_bytes=video_bytes,
                            exception=exception,
                            transport_exception=transport_exception,
                            recording_aborted=recording_aborted
                        ))
                        # signal to business logic that decoding ends
                        await self.transport_adapter.frame_queue.put(None)
                        self._recording_start = False

            except self.transport_exceptions as ex:
                self.logger.debug("Stop message handling cycle:  %s-%s", type(ex).__name__, ex)
                # raise errors to fastapi router level and abort connection
                raise ex

            except Exception as ex:
                self.logger.error("Error occurred on handling client messages: %s-%s", type(ex).__name__, ex, exc_info=True)
                # try to inform client about error without aborting connection
                await self.socket_context.websocket.send_text(
                    MessageProcessor.form_exception_message(ex).to_string()
                )
