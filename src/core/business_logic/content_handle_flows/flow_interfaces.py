import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from asyncio import CancelledError
from typing import Optional, List, Tuple

from anyio import create_task_group, fail_after

import settings
from core.business_logic.contexts import MessageHandlingContext
from core.business_logic.frame_jobs import AfterRecordingJob, ParallelRecordingJob
from core.business_logic.interface.video_transport_adapter import VideoTransportAdapterInterface
from core.business_logic.types import ContentInfo, FileData, VideoCodec, VideoContainer, PixelFormat
from utils.exceptions import VideoJobTimeout
from utils.exceptions import form_exception_traceback


class BaseFlow(ABC):
    def __init__(
        self,
        content_id: uuid.UUID,
        context: MessageHandlingContext,
        video_transport_adapter: VideoTransportAdapterInterface,
        logger: logging.Logger
    ):
        self.content_id = content_id
        self.context = context
        self.video_transport_adapter = video_transport_adapter
        self.logger = logger

    async def handle_exception(self, exception: Exception):
        self.logger.error(
            "Error occurred while handling content: %s-%s\n%s",
            type(exception).__name__,
            exception,
            form_exception_traceback(exception)
        )

        await self.video_transport_adapter.send_exception(exception)

    @abstractmethod
    async def handling_task(self) -> Optional[List[ContentInfo]]:
        pass


class VideoRecordFlowInterface(BaseFlow, ABC):
    video_type = None

    def __init__(
            self,
            content_id: uuid.UUID,
            context: MessageHandlingContext,
            codec: VideoCodec,
            container: VideoContainer,
            pixel_format: PixelFormat,
            width_x_height: Tuple[int, int],
            bitrate: int,
            fps: int,
            params: dict,
            video_transport_adapter: VideoTransportAdapterInterface,
            after_recording_jobs: List[AfterRecordingJob],
            parallel_recording_jobs: List[ParallelRecordingJob],
            logger: logging.Logger
    ):
        super().__init__(content_id, context, video_transport_adapter, logger)

        self.codec = codec
        self.container = container
        self.pixel_format = pixel_format
        self.width_x_height = width_x_height
        self.bitrate = bitrate
        self.fps = fps
        self.after_recording_jobs = after_recording_jobs
        self.parallel_recording_jobs = parallel_recording_jobs
        self.params = params

        self.raw_frames_needed = len(self.parallel_recording_jobs) != 0

        if self.raw_frames_needed:
            self.parallel_jobs_ready_signal_queue = parallel_recording_jobs[0].ready_signal_queue
        else:
            self.parallel_jobs_ready_signal_queue = None

        self.content_results = []


    async def handling_task(self) -> Optional[List[ContentInfo]]:
        """
        Recording task that handle all video recording process that same for all videos


        Returns:
            Return optional video info.

            If VideoInfo with None value means that video recording aborted by component
        """
        try:
            async with (create_task_group() as tg):
                if self.raw_frames_needed:
                    for parallel_recording_job in self.parallel_recording_jobs:
                        tg.start_soon(parallel_recording_job.processing_task)

                await self.video_transport_adapter.start_recording(
                    self.container,
                    self.codec,
                    self.pixel_format,
                    self.width_x_height,
                    self.bitrate,
                    self.fps,
                    self.video_type.value,
                    raw_frames_needed=self.raw_frames_needed
                )

                while True:
                    frame = await self.video_transport_adapter.recv_video_frame()

                    if self.raw_frames_needed:
                        for parallel_recording_job in self.parallel_recording_jobs:
                            parallel_recording_job.frames_queue.put_nowait(frame)

                    # get signal that video recording ended
                    if frame is None:
                        break

                video_result = self.video_transport_adapter.get_video_result()
                if video_result.exception is not None:
                    tg.cancel_scope.cancel()
                    return self._get_content_result(video_result.video_bytes, video_result.exception)
                elif video_result.recording_aborted:
                    tg.cancel_scope.cancel()
                    # send recording aborted to client
                    await self.video_transport_adapter.send_message("Video record abort by component")
                    return None
                elif video_result.transport_exception:
                    tg.cancel_scope.cancel()
                    self.logger.info("Video record aborted by transport")
                    return None

                # execute after recording tasks
                if self.after_recording_jobs:
                    after_recording_tasks = []
                    for after_recording_job in self.after_recording_jobs:
                        after_recording_tasks.append(after_recording_job.process(video_result.video_bytes))

                    try:
                        with fail_after(settings.JOB_SAVING_TIMEOUT):
                            gather_object = asyncio.gather(*after_recording_tasks)
                            await gather_object
                    except TimeoutError:
                        # get all canceled jobs if TimeoutError occurred and get its class names
                        await self.handle_exception(VideoJobTimeout(
                            f"After job timeout occurred. "
                            f"Timeout jobs: "
                            f"{[x._coro.__qualname__.split('.')[0] for x in gather_object._children if x.cancelled()]}"
                        ))
                        return None

                # wait for parallel recording tasks.
                # No check for decoder hang up e.d. if decoder hangs up jobs hangs up too. If no jobs executed decoder not executed too
                if self.parallel_jobs_ready_signal_queue is not None:
                    jobs_to_check_names = set([type(x).__name__ for x in self.parallel_recording_jobs])
                    # save job class names for proper exception
                    passed_jobs = set()

                    try:
                        with fail_after(settings.JOB_SAVING_TIMEOUT):
                            while True:
                                job_class = await self.parallel_jobs_ready_signal_queue.get()
                                passed_jobs.add(job_class)

                                if len(passed_jobs) == len(jobs_to_check_names):
                                    break
                    except TimeoutError:
                        await self.handle_exception(VideoJobTimeout(
                            f"Parallel job timeout occurred. Timeout jobs: {jobs_to_check_names.difference(passed_jobs)}"
                        ))
                        return None

                return self._get_content_result(video_result.video_bytes)
        except Exception as ex:
            # stop recording in video transport level if exception occurred in task group
            if not isinstance(ex, CancelledError):
                await self.video_transport_adapter.stop_recording()

            raise
        finally:
            # log errors occurred in recorder context and send messages to client
            for content in self.content_results:
                if content.original_exception is not None:
                    await self.handle_exception(content.original_exception)

    def _get_content_result(self, video_bytes: bytes, exception: Optional[Exception] = None) -> List[ContentInfo]:
        content_infos = [ContentInfo(id=self.content_id, files=[], type=self.video_type)]

        if exception is None:
            content_infos[0].files.append(
                FileData(
                    data=video_bytes,
                    extension=settings.ffmpeg_to_system.get(self.container.name, self.container.name)
                )
            )

            # wait jobs for result
            for parallel_recording_job in self.parallel_recording_jobs:
                parallel_recording_job.save_result(content_infos)

            for after_recording_job in self.after_recording_jobs:
                after_recording_job.save_result(content_infos)
        else:
            content_infos[0].files.append(
                FileData(
                    data=video_bytes,
                    extension="bin"
                )
            )
            content_infos[0].fill_exception_info(exception)

        self.content_results.extend(content_infos)
        return content_infos