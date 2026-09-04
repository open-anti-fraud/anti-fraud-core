import datetime
import uuid
from typing import Optional, List

from base_types import MotionControlInfo
from core.business_logic.content_handle_flows.flow_interfaces import VideoRecordFlowInterface
from core.business_logic.types import ContentInfo, ContentType, VideoInfoMCWrapper, FileData
from integration.object_storage.models import extension_to_s3_class_map
from integration.object_storage.utils import generate_s3_link
from utils.exceptions import McReferenceImageCount
from utils.transport_messages.types import IncomingMessageType


class MotionControlRecordFlow(VideoRecordFlowInterface):
    video_type = ContentType.motion_control_video

    async def handling_task(self) -> Optional[List[ContentInfo]]:
        """
        Override parent video recording cycle with additional messages special for motion control flow
        """
        # send transferring permitted signal
        await self.video_transport_adapter.send_message("Transferring permitted")

        # enter parent video recording cycle
        content_info = await super().handling_task()

        # first element of content is always video
        if content_info is None or content_info[0].exception_info is not None:
            return content_info

        video_content = content_info[0]

        _, message_body = await self.video_transport_adapter.recv_message(IncomingMessageType.data)

        mc_info = MotionControlInfo.model_validate(message_body)

        await self.video_transport_adapter.send_message("Motion control video recorded")

        if self.params.get("record_mc_reference_frames", False):
            self.logger.info("Handle motion control reference frames")
            await self.video_transport_adapter.start_receiving_binary_data()
            await self.video_transport_adapter.send_message("Transferring permitted")

            img_count = 0
            while True:
                image_data = await self.video_transport_adapter.recv_binary_data()

                if image_data is None:
                    break

                content_type = ContentType.motion_control_frame
                content_id = uuid.uuid4()
                extension = "jpeg"
                s3_class = extension_to_s3_class_map[extension]
                name = (f"{content_type.name}-mcf"
                        f"-{datetime.datetime.now().strftime('%y-%m-%d-%H_%M_%S')}"
                        f"-{str(video_content.id)[:5]}"
                        f"-{str(self.context.endeavor_id)[:5]}"
                        f"-{str(content_id)[:5]}"
                        f".{extension}")

                img_content = ContentInfo(
                    type=content_type,
                    files=[
                        FileData(
                            data=image_data,
                            extension=extension,
                            s3_class=s3_class,
                            name=name
                        )
                    ],
                    id=content_id,
                    parent_id=video_content.id,
                )
                content_info.append(img_content)

                try:
                    mc_info.root[img_count].photo_link = generate_s3_link(s3_class.bucket_name, name)
                except IndexError:
                    raise McReferenceImageCount("Invalid motion control images count.")

                img_count += 1

            await self.video_transport_adapter.send_message("Motion control frames recorded")

        video_content_wrapper = VideoInfoMCWrapper(video_content)
        video_content_wrapper.result = mc_info

        return content_info