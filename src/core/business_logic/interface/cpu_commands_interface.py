from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import List, Tuple, AsyncGenerator, Callable

from core.business_logic.types import VideoContainer, VideoCodec, PixelFormat


class CPUCommandsInterface(ABC):
    @abstractmethod
    async def decode_video_chunks_to_frames(self, session_id: str) -> AsyncGenerator[Callable]:
        """
        Decode video chunk or whole video and return list of pickled Frame types

        Async context that returns decoding function to which you must pass chunk in bytes format
        for get list of Frame types.
        When context closes session is automatically cleared.

        Example:

        async with decode_video_chunks_to_frames(self.session_id) as work_function:
            frames = await work_function(chunk)

        Parameters:
        data (bytes): Whole video or video chunk that goes next in session_id,
        session_id optional(str): Session id which defines a single decoding sequence in which video chunks follow each other for successful video decoding.
        """

        raise NotImplementedError()

    @asynccontextmanager
    async def dummy_decode_video_chunks_to_frames(self, session_id: str) -> AsyncGenerator[Callable]:
        """Use this if you do not need decoding under some conditions"""

        async def work_function(chunk: bytes) -> List[bytes]:
            pass

        yield work_function

    @abstractmethod
    async def get_random_frame_from_video(self, video: bytes) -> bytes:
        """
        Decode video and return random frame from it that is pickled Frame type

        Parameters:
        video (bytes): Video data in bytes format
        """
        raise NotImplementedError()

    @abstractmethod
    async def cast_video_frame_to_image(self, frame_data: bytes) -> bytes:
        """
        Get image from Frame type

        Parameters:
        frame_data (bytes) Frame type pickled to bytes
        """
        raise NotImplementedError()

    @abstractmethod
    async def cast_packets_to_frames_and_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        """
        Decode list packets and return list of pickled Frame types

        Async context that returns decoding function to which you must pass chunk in bytes format
        for get list of Frame types.
        And list in the null element of which will be bytes of the recorded video after the context is closed

        When context closes session is automatically cleared and video result saved in list.

        Example:

        async with decode_video_chunks_to_frames(self.session_id) as result_tuple:
            work_function, result_list = result_tuple

            frames = await work_function(chunk)

        video_data = result_list[0]

        Parameters:
        session_id str: Session id which defines a single decoding sequence.
        container VideoContainer: Container to which video will be muxed
        codec VideoCodec: Codec which will be used for decoding input frames
        pixel_format PixelFormat: Pixel format of input frames
        width_x_height Tuple[int, int]: Width and height of input frames
        bitrate int: Bitrate which used to encode input frames
        fps int: Frame rate of input frames
        """

        raise NotImplementedError()


    @abstractmethod
    async def cast_packets_to_video(
            self,
            session_id: str,
            container: VideoContainer,
            codec: VideoCodec,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
    ) -> AsyncGenerator[Tuple[Callable, List]]:
        """
        Mux list of packets to video

        Async context that returns muxing function to which you must pass chunk in bytes format.
        And list in the null element of which will be bytes of the recorded video after the context is closed

        When context closes session is automatically cleared and video result saved in list.

        Example:

        async with decode_video_chunks_to_frames(self.session_id) as result_tuple:
            work_function, result_list = result_tuple

            await work_function(chunk)

        video_data = result_list[0]

        Parameters:
        session_id str: Session id which defines a single muxing sequence
        container VideoContainer: Container to which video will be muxed
        codec VideoCodec: Codec which will be used for muxing stream
        pixel_format PixelFormat: Pixel format of input frames
        width_x_height Tuple[int, int]: Width and height of input frames
        bitrate int: Bitrate which used to encode input frames
        fps int: Frame rate of input frames
        """

        raise NotImplementedError()
