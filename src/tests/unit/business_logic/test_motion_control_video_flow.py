import logging
import os
import sys
import uuid
from collections import deque

import pytest

cwd = os.getcwd()
sys.path.append(cwd)

from tests.utils import set_up_env
set_up_env()

from base_types import Action
from core.business_logic.content_handle_flows.flows.motion_control import MotionControlRecordFlow
from utils.transport_messages.types import IncomingMessageType
from core.business_logic.contexts import MessageHandlingContext
from core.business_logic.types import PixelFormat, VideoContainer, VideoCodec, VideoResult, VideoInfoMCWrapper
from tests.unit.business_logic.mock_utils import cpu_commands_mock, video_transport_adapter_mock


@pytest.fixture(scope="function")
def motion_control_flow_instance() -> MotionControlRecordFlow:
    logger = logging.getLogger("test_mc")
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

    return MotionControlRecordFlow(
        content_id=uuid.uuid4(),
        context=context,
        codec=VideoCodec.vp8,
        container=VideoContainer.webm,
        pixel_format=PixelFormat.yuv420p,
        width_x_height=(10, 10),
        bitrate=10,
        fps=10,
        video_transport_adapter=video_transport_adapter_mock(
            video_frames=deque([b'frame', b'frame', None]),
            client_message=deque([(IncomingMessageType.data, [{'pattern': 'up', 'result': True},]),]) # noqa
        ),
        after_recording_jobs=[],
        parallel_recording_jobs=[],
        logger=logger,
        params={}
    )


class TestMotionControlVideoFlow:

    @pytest.mark.asyncio
    async def test_video_record(self, motion_control_flow_instance):
        vtad = motion_control_flow_instance.video_transport_adapter
        video_bytes = b'video'
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=video_bytes,
            transport_exception=False,
            exception=None,
            recording_aborted=False
        )

        # update messages to flow
        new_client_messages = deque(
            [
                (IncomingMessageType.data, [{'pattern': 'left', 'result': True},]),
            ]
        )
        vtad.recv_message.side_effect = lambda _: new_client_messages.popleft()

        content_info = await motion_control_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),), (("Motion control video recorded",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info[0].files[0].data == video_bytes
        content_info = VideoInfoMCWrapper(content_info[0]).result

        assert content_info.root[0].pattern == Action.left
        assert content_info.root[0].result


    @pytest.mark.asyncio
    async def test_video_record_abort(self, motion_control_flow_instance):
        vtad = motion_control_flow_instance.video_transport_adapter
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=False,
            exception=None,
            recording_aborted=True
        )

        content_info = await motion_control_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),), (("Video record abort by component",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info is None


    @pytest.mark.asyncio
    async def test_video_record_exception(self, motion_control_flow_instance):
        vtad = motion_control_flow_instance.video_transport_adapter
        record_exception = Exception("wow")
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=False,
            exception=record_exception,
            recording_aborted=False
        )

        content_info = await motion_control_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_exception.call_args_list == [((record_exception,),)]
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info[0].original_exception == record_exception

    @pytest.mark.asyncio
    async def test_video_record_transport_exception(self, motion_control_flow_instance):
        vtad = motion_control_flow_instance.video_transport_adapter
        vtad.get_video_result.return_value = VideoResult(
            video_bytes=None,
            transport_exception=True,
            exception=None,
            recording_aborted=False
        )

        content_info = await motion_control_flow_instance.handling_task()

        # check sent messages
        assert vtad.send_message.call_args_list == [(("Transferring permitted",),)]

        assert vtad.recv_video_frame.call_count == 3
        assert vtad.start_recording.call_count == 1
        assert vtad.get_video_result.call_count == 1

        assert content_info is None