import asyncio
import logging
from typing import List

from core.business_logic.content_handle_flows.flows.blank_video import BlankVideoRecordFlow
from core.business_logic.content_handle_flows.flow_interfaces import BaseFlow
from core.business_logic.content_handle_flows.flows.reference_image import ReferenceImagesFlow
from core.business_logic.content_handle_flows.flows.motion_control import MotionControlRecordFlow
from core.business_logic.content_handle_flows.flows.reference_image_demo import ReferenceImagesDemoFlow
from core.business_logic.contexts import MessageHandlingContext
from core.business_logic.frame_jobs import (ReferenceFrameJobP, ReferenceFrameJobA, ParallelRecordingJob,
                                            AfterRecordingJob)
from core.business_logic.interface.video_transport_adapter import VideoTransportAdapterInterface
from core.business_logic.types import ContentType, ContentHandleRequest, VideoRecordContextData
from utils.exceptions import UnsupportedContentType


class ContentHandleFlowFactory:
    vid_content_type_to_flow_mapping = {
        ContentType.motion_control_video: MotionControlRecordFlow,
        ContentType.blank_video: BlankVideoRecordFlow,
    }

    @classmethod
    def build(
            cls,
            video_transport_adapter: VideoTransportAdapterInterface,
            context: MessageHandlingContext,
            request: ContentHandleRequest,
            logger: logging.Logger
    ) -> BaseFlow:
        match request.type:
            case ContentType.reference_frame:
                return ReferenceImagesFlow(
                    content_id=request.id,
                    context=context,
                    video_transport_adapter=video_transport_adapter,
                    logger=logger
                )
            case ContentType.reference_frame_demo:
                return ReferenceImagesDemoFlow(
                    content_id=request.id,
                    context=context,
                    video_transport_adapter=video_transport_adapter,
                    logger=logger
                )
            case ContentType.motion_control_video | ContentType.blank_video:
                content_context_data = VideoRecordContextData.model_validate(request.content_context_data)

                after_recording_jobs: List[AfterRecordingJob] = []
                parallel_recording_jobs: List[ParallelRecordingJob] = []

                # same for all parallel jobs queue
                # ready_signal_parallel_jobs_queue = asyncio.Queue()
                # if content_context_data.capture_reference_frame:
                #     if (
                #             video_transport_adapter.capability is not None and
                #             video_transport_adapter.capability.unable_decode_raw_frames.check_capability_matching(
                #                 content_context_data.codec,
                #                 content_context_data.container
                #             )
                #     ):
                #         after_recording_jobs.append(ReferenceFrameJobA(logger, context.cpu_commands))
                #     else:
                #         parallel_recording_jobs.append(
                #             ReferenceFrameJobP(ready_signal_parallel_jobs_queue, context.cpu_commands)
                #         )
                flow_class = cls.vid_content_type_to_flow_mapping[request.type]

                return flow_class(
                    content_id=request.id,
                    context=context,
                    codec=content_context_data.codec,
                    container=content_context_data.container,
                    pixel_format=content_context_data.pixel_format,
                    width_x_height=content_context_data.width_x_height,
                    bitrate=content_context_data.bitrate,
                    fps=content_context_data.fps,
                    params=content_context_data.params,
                    video_transport_adapter=video_transport_adapter,
                    after_recording_jobs=after_recording_jobs,
                    parallel_recording_jobs=parallel_recording_jobs,
                    logger=logger
                )
            case _:
                raise UnsupportedContentType()