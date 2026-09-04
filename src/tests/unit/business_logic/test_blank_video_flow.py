import logging
import os
import sys
import uuid
from collections import deque

cwd = os.getcwd()
sys.path.append(cwd)

from tests.utils import set_up_env
set_up_env()

import pytest
from core.business_logic.content_handle_flows.flows.blank_video import BlankVideoRecordFlow
from core.business_logic.contexts import MessageHandlingContext
from core.business_logic.types import PixelFormat, VideoContainer, VideoCodec, VideoResult
from tests.unit.business_logic.mock_utils import cpu_commands_mock, video_transport_adapter_mock


@pytest.fixture(scope="function")
def blank_video_flow_instance() -> BlankVideoRecordFlow:
    logger = logging.getLogger("test_bv")
    logger.handlers.clear()
    s_handler = logging.StreamHandler()
    logger.addHandler(s_handler)
    logger.propagate = False
    logger.setLevel(logging.ERROR)

    context = MessageHandlingContext(
        cpu_commands=cpu_commands_mock(),
        endeavor_id=uuid.uuid4(),
        aggregate_entity_id=uuid.uuid4()
    )

    return BlankVideoRecordFlow(
        content_id=uuid.uuid4(),
        context=context,
        codec=VideoCodec.vp8,
        container=VideoContainer.webm,
        pixel_format=PixelFormat.yuv420p,
        width_x_height=(10, 10),
        bitrate=10,
        fps=10,
        video_transport_adapter=video_transport_adapter_mock(
            video_frames=deque([b'frame', b'frame', None])
        ),
        after_recording_jobs=[],
        parallel_recording_jobs=[],
        logger=logger,
        params={}
    )


class TestBlankVideoFlow:

    @pytest.mark.asyncio
    async def test_video_record(self, blank_video_flow_instance):
        vtad = blank_video_flow_instance.video_transport_adapter
        video_bytes = b'video'
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=video_bytes,
            transport_exception=False,
            exception=None,
            recording_aborted=False
        )

        content_info = await blank_video_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),), (("Blank video recorded",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info[0].files[0].data == video_bytes


    @pytest.mark.asyncio
    async def test_video_record_abort(self, blank_video_flow_instance):
        vtad = blank_video_flow_instance.video_transport_adapter
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=False,
            exception=None,
            recording_aborted=True
        )

        content_info = await blank_video_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),), (("Video record abort by component",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info is None


    @pytest.mark.asyncio
    async def test_video_record_exception(self, blank_video_flow_instance):
        vtad = blank_video_flow_instance.video_transport_adapter
        record_exception = Exception("wow")
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=False,
            exception=record_exception,
            recording_aborted=False
        )

        content_info = await blank_video_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_exception.call_args_list == [((record_exception,),)]
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info[0].original_exception == record_exception

    @pytest.mark.asyncio
    async def test_video_record_transport_exception(self, blank_video_flow_instance):
        vtad = blank_video_flow_instance.video_transport_adapter
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=True,
            exception=None,
            recording_aborted=False
        )

        content_info = await blank_video_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info is None