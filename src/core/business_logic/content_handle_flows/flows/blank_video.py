from typing import Optional, List
from core.business_logic.content_handle_flows.flow_interfaces import VideoRecordFlowInterface
from core.business_logic.types import ContentInfo, ContentType

class BlankVideoRecordFlow(VideoRecordFlowInterface):
    video_type = ContentType.blank_video

    async def handling_task(self) -> Optional[List[ContentInfo]]:
        """
        Override parent video recording cycle with additional messages special for blank video flow
        """
        # send transferring permitted signal
        await self.video_transport_adapter.send_message("Transferring permitted")
        # enter parent video recording cycle
        video_info = await super().handling_task()

        # first element of content is always video
        if video_info is None or video_info[0].exception_info is not None:
            return video_info

        await self.video_transport_adapter.send_message("Blank video recorded")

        return video_info
