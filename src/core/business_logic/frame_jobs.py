import asyncio
import secrets
from abc import ABC, abstractmethod
from typing import List

from core.business_logic.interface.cpu_commands_interface import CPUCommandsInterface
from core.business_logic.types import ContentInfo, ContentType, FileData
from core.managers import ImageApiManagerBL
from utils.exceptions import NoJobResult


class SaveResultToVideoInfoMixin:
    @abstractmethod
    def save_result(self, content_infos: List[ContentInfo]):
        pass

class ParallelRecordingJob(SaveResultToVideoInfoMixin):
    __metaclass__ = ABC

    def __init__(self, ready_signal_queue: asyncio.Queue):
        self.frames_queue = asyncio.Queue()
        self.ready_signal_queue = ready_signal_queue
        self.processing_exception = None

    @abstractmethod
    async def processing_task(self):
        pass


class AfterRecordingJob(SaveResultToVideoInfoMixin):
    __metaclass__ = ABC

    def __init__(self):
        self.processing_exception = None

    @abstractmethod
    async def process(self, video: bytes):
        pass


class ReferenceFrameJobP(ParallelRecordingJob):
    def __init__(self, ready_signal_queue: asyncio.Queue, cpu_commands: CPUCommandsInterface):
        self.output_files = []
        self.cpu_commands = cpu_commands
        super().__init__(ready_signal_queue)

    async def process_frame(self, frame: bytes):
        try:
            encoded_image = await self.cpu_commands.cast_video_frame_to_image(frame)
        except Exception as ex:
            # save raw frame and error if frame converting error occurred
            self.output_files.append(FileData(data=frame, extension="bin"))
            self.processing_exception = ex
            return

        self.output_files.append(FileData(data=encoded_image, extension="jpeg"))
        try:
            _, template = await ImageApiManagerBL.get_template_info(
                encoded_image
            )
            self.output_files.append(FileData(data=template, extension="bin"))
        except Exception as ex:
            # save error if image template processing occurred
            self.processing_exception = ex

    async def processing_task(self):
        prev_frame = None

        while True:
            frame = await self.frames_queue.get()

            if frame is None:
                break

            # save prev obtained frames if random not triggered
            prev_frame = frame

            if len(self.output_files) == 0 and (secrets.randbelow(50) == 6):
                await self.process_frame(prev_frame)

        # get ref frame anyway if random not triggered
        if len(self.output_files) == 0 and prev_frame is not None:
            await self.process_frame(prev_frame)

        self.ready_signal_queue.put_nowait(type(self).__name__)

    def save_result(self, content_infos: List[ContentInfo]):
        if len(self.output_files) == 0 :
            raise NoJobResult()

        content_info = ContentInfo(
            parent_id=content_infos[0].id,
            type=ContentType.reference_frame,
            files=self.output_files
        )

        if self.processing_exception is not None:
            content_info.fill_exception_info(self.processing_exception)

        content_infos.append(content_info)


class ReferenceFrameJobA(AfterRecordingJob):
    def __init__(self, external_logger, cpu_commands: CPUCommandsInterface):
        self.output_files = []
        self.logger = external_logger
        self.cpu_commands = cpu_commands
        super().__init__()

    async def _get_random_frame(self, video) -> bytes:
        return await self.cpu_commands.get_random_frame_from_video(video)

    async def process(self, video: bytes):
        try:
            rnd_frame = await self._get_random_frame(video)
        except Exception as ex:
            # save error if frame from video decoding error occurred
            self.processing_exception = ex
            return

        try:
            encoded_image = await self.cpu_commands.cast_video_frame_to_image(rnd_frame)
        except Exception as ex:
            # save chosen frame and error if frame converting error occurred
            self.output_files.append(FileData(data=rnd_frame, extension="bin"))
            self.processing_exception = ex
            return

        self.output_files.append(FileData(data=encoded_image, extension="jpeg"))
        try:
            _, template = await ImageApiManagerBL.get_template_info(
                encoded_image
            )
            self.output_files.append(FileData(data=template, extension="bin"))
        except Exception as ex:
            # save error if image template processing occurred
            self.processing_exception = ex


    def save_result(self, content_infos: List[ContentInfo]):
        # raise no_result_in_job error only if processing exception not occurred because video decoding error cause zero output files.
        if len(self.output_files) == 0 and self.processing_exception:
            raise NoJobResult()

        content_info = ContentInfo(
            parent_id=content_infos[0].id,
            type=ContentType.reference_frame,
            files=self.output_files
        )

        if self.processing_exception is not None:
            content_info.fill_exception_info(self.processing_exception)

        content_infos.append(content_info)