import logging
import os
import sys
import uuid
from collections import deque
from dataclasses import dataclass
from typing import Optional

cwd = os.getcwd()
sys.path.append(cwd)

from tests.utils import set_up_env
set_up_env()

import pytest

from core.business_logic.content_handle_flows.flows.reference_image import ReferenceImagesFlow
from core.business_logic.contexts import MessageHandlingContext
from tests.unit.business_logic.mock_utils import cpu_commands_mock, video_transport_adapter_mock


@pytest.fixture(scope="function")
def reference_images_flow_instance() -> ReferenceImagesFlow:
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

    return ReferenceImagesFlow(
        content_id=uuid.uuid4(),
        context=context,
        video_transport_adapter=video_transport_adapter_mock(
            binary_data=deque([b'image', b'image', b'image', None])
        ),
        logger=logger
    )


class TestReferenceImageFlow:
    @dataclass
    class FrameInfo:
        image: bytes
        parent_id: Optional[uuid.UUID] = None
        frame_number: Optional[int] = None
        yaw: Optional[int] = None,
        pitch: Optional[int] = None

        def __post_init__(self):
            object.__setattr__(self, "binary_repr", TestReferenceImageFlow._generate_frame(
                image=self.image,
                parent_id=self.parent_id,
                frame_number=self.frame_number,
                yaw=self.yaw,
                pitch=self.pitch
            ))

    @staticmethod
    def _generate_frame(
            image: bytes,
            parent_id: Optional[uuid.UUID] = None,
            frame_number: Optional[int] = None,
            yaw: Optional[int] = None,
            pitch: Optional[int] = None
    ) -> bytes:
        parent_id = parent_id.hex.encode() if parent_id else uuid.UUID('00000000-0000-0000-0000-000000000000').hex.encode()
        frame_number = frame_number.to_bytes(4, byteorder="big") if frame_number else b'\xff\xff\xff\xff'
        yaw = yaw.to_bytes(2, byteorder="big") if yaw else b'\xff\xff'
        pitch = pitch.to_bytes(2, byteorder="big") if pitch else b'\xff\xff'

        return parent_id + frame_number + yaw + pitch + image

    @pytest.mark.asyncio
    @pytest.mark.parametrize("ref_frame_count", [1, 3, 10])
    async def test_reference_image_flow(self, reference_images_flow_instance, ref_frame_count: int):
        vtad = reference_images_flow_instance.video_transport_adapter

        parent_id = uuid.uuid4()
        frames = {}
        for i in range(ref_frame_count):
            frame_index = i + 1
            frames[frame_index] = self.FrameInfo(
                b'image' + frame_index.to_bytes(),
                parent_id,
                frame_index,
                10 + frame_index,
                20 + frame_index
            )
        new_frames = deque(
            [*[frame.binary_repr for frame in frames.values()], None]
        )
        vtad.recv_binary_data.side_effect = lambda: new_frames.popleft()

        content_info = await reference_images_flow_instance.handling_task()
        assert len(content_info) == 1

        for content_info in content_info:
            frame_number = content_info.info["frame_number"]
            parent_id = content_info.parent_id
            yaw, pitch = content_info.info["angles"]
            binary_data = content_info.files[0].data

            assert parent_id == frames[frame_number].parent_id
            assert yaw == frames[frame_number].yaw
            assert pitch == frames[frame_number].pitch
            assert binary_data == frames[frame_number].image
