import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from logging import Logger
from typing import Any, Tuple, Optional, Set, Union, List, Dict

import settings
from core.business_logic.types import PixelFormat, VideoCodec, VideoContainer, VideoResult
from utils.exceptions import ComponentMessageSendTimeout, ExceptionCode, exception_to_dict
from utils.transport_messages.processor import MessageProcessor
from utils.transport_messages.types import IncomingMessageType, OutcomingMessageType, OutcomingMessage


@dataclass
class CapabilityInfo:
    codecs: Optional[Set[VideoCodec]] = None
    containers: Optional[Set[VideoContainer]] = None

    def check_capability_matching(self, video_codec: VideoCodec, video_container: VideoContainer) -> bool:
        return (self.codecs is not None and video_codec in self.codecs) or (self.containers is not None and video_container in self.containers)


@dataclass
class TransportCapability:
    unable_decode_raw_frames: Optional[CapabilityInfo] = None


class VideoTransportAdapterInterface(ABC):
    capability: TransportCapability = None

    @abstractmethod
    async def _channel_send_message(self, message: str):
        """
        Allows business logic to send message to client trough transport channels

        Parameters:
        message (str): Message converted to string by _prepare_outcoming_message method
        """
        raise NotImplemented

    @abstractmethod
    async def _channel_recv_message(self) -> str:
        """
        Allows business logic to receive message from client trough transport channels

        Returns:
        str: Message in raw string format that will be converted to IncomingMessageType type by _parse_incoming_message method
        """
        raise NotImplemented

    @abstractmethod
    async def recv_video_frame(self) -> bytes:
        """
        Allows business logic to get raw footage from recorded video

        Returns:
        bytes: raw video frame that is pickled Frame type
        """
        raise NotImplemented

    @abstractmethod
    async def recv_binary_data(self) -> bytes:
        """
        Allows business logic to get binary data i.e. images from client

        Returns:
        bytes: raw image
        """
        raise NotImplemented

    async def start_receiving_binary_data(self):
        """
        Allows a business to trigger transport to transfer all binary data right to business
        """
        raise NotImplemented

    async def stop_receiving_binary_data(self):
        """
        Allows a business to stop transferring all binary data right to business
        """
        raise NotImplemented

    @abstractmethod
    async def start_recording(self,
                              container: VideoContainer,
                              codec: VideoCodec,
                              pixel_format: PixelFormat,
                              width_x_height: Tuple[int, int],
                              bitrate: int,
                              fps: int,
                              video_type: str,
                              raw_frames_needed: Optional[bool] = True):
        """
        Allows a business to trigger video recording across transport channels

        The business logic realizes that video recording is finished when it receives None via the recv_video_frame method call
        So transport must send None to logic when recording ends
        """
        raise NotImplemented

    @abstractmethod
    async def stop_recording(self):
        """
        Allows business logic to stop video recording at the transport level
        if something unusual happens during video processing on the logic side, e.g. an error occurs.
        In normal circumstances, the transport itself stops recording when it receives a signal from the client
        """

        raise NotImplemented

    def __init__(self):
        self._video: Optional[VideoResult] = None
        self._bl_logger = None

    def add_bl_logger(self, logger: Logger):
        self._bl_logger = logger

    def save_video_result(self, video_result: VideoResult):
        self._video = video_result

    def get_video_result(self) -> VideoResult:
        if self._video is not None:
            video = self._video
            self._video = None
            return video
        else:
            raise Exception("No video result, but one requested")

    @staticmethod
    def _prepare_outcoming_message_from_text(
            message_type: OutcomingMessageType,
            body: Any,
            exc_code: Optional[str] = None
    ) -> str:
        return MessageProcessor.build_outcoming_message(
                message_type,
                body,
                exc_code
        ).to_string()

    @staticmethod
    def _prepare_outcoming_message_from_message(message: OutcomingMessage) -> str:
        return message.to_string()

    @staticmethod
    def _parse_incoming_message(message: Union[str|dict]) -> Tuple[IncomingMessageType, Optional[Any]]:
        incoming_message = MessageProcessor.parse_incoming_message(message)
        return incoming_message.type, incoming_message.body

    async def send_message(self, message: str):
        self._bl_logger.info(f"Send message to client: {message}")

        prepared_message = self._prepare_outcoming_message_from_text(OutcomingMessageType.message, message)
        await self._channel_send_message(prepared_message)

    async def send_info(self, data: Any):
        self._bl_logger.info(f"Send info to client: {data}")

        prepared_message = self._prepare_outcoming_message_from_text(OutcomingMessageType.data, data)
        await self._channel_send_message(prepared_message)

    async def send_exception(self, exception: BaseException):
        self._bl_logger.info(f"Send message to client: {type(exception).__name__}-{exception}")

        prepared_message = self._prepare_outcoming_message_from_message(
            MessageProcessor.form_exception_message(exception)
        )

        await self._channel_send_message(prepared_message)

    async def send_exception_mapping(self, exception_mapping: Dict[str, List[BaseException]]):
        self._bl_logger.info(f"Send exception list to client")

        reformatted_mapping = {}

        for key, value in exception_mapping.items():
            reformatted_mapping[key] = [
                exception_to_dict(ex) for ex in value
            ]

        prepared_message = self._prepare_outcoming_message_from_text(
            OutcomingMessageType.exception,
            reformatted_mapping,
            ExceptionCode.exception_mapping
        )

        await self._channel_send_message(prepared_message)

    async def recv_message(
            self,
            expected_type: Optional[IncomingMessageType] = None
    ) -> Tuple[IncomingMessageType, Optional[dict]]:
        try:
            incoming_message = await asyncio.wait_for(
                self._channel_recv_message(),
                timeout=settings.MESSAGE_WAIT_TIMEOUT
            )
        except asyncio.TimeoutError:
            raise ComponentMessageSendTimeout()

        message_type, message_body = self._parse_incoming_message(
            incoming_message
        )

        self._bl_logger.info(f"Receive message from client: {incoming_message}")

        if expected_type is not None and message_type != expected_type:
            raise Exception("Unexpected message type")

        return message_type, message_body
