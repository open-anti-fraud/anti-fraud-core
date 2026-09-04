from asyncio import CancelledError
from typing import Optional, List

from aiohttp import ClientSession

from core.business_logic.content_handle_flows.flow_interfaces import BaseFlow
from core.business_logic.types import ContentInfo
from core.managers import ImageApiManagerBL
from utils.exceptions import InvalidImageWithFace


class ReferenceImagesDemoFlow(BaseFlow):
    @staticmethod
    def prepare_json_data(processing_result) -> dict:
        return {
            "quality": processing_result.sample["objects"][0]["quality"],
            "liveness": processing_result.sample["objects"][0]["liveness"],
            "deepfake": processing_result.sample["objects"][0]["deepfake"]
        }

    async def handling_task(self) -> Optional[List[ContentInfo]]:
        await self.video_transport_adapter.start_receiving_binary_data()

        # send transferring permitted signal
        await self.video_transport_adapter.send_message("Transferring permitted")

        try:
            async with ClientSession() as http_session:
                while True:
                    image_data = await self.video_transport_adapter.recv_binary_data()

                    if image_data is None:
                        break

                    try:
                        processing_result = ImageApiManagerBL.ProcessingResult(sample=None, exception_list=[])
                        await ImageApiManagerBL.get_full_frame_info(image_data, processing_result, http_session)

                        if processing_result.exception_list:
                            raise processing_result.exception_list[0]

                        await self.video_transport_adapter.send_info(
                            data=self.prepare_json_data(processing_result)
                        )
                    except InvalidImageWithFace:
                        await self.video_transport_adapter.send_message(
                            message="No faces found on image"
                        )

                await self.video_transport_adapter.send_message(
                    message="Frames handled"
                )
                return None

        except Exception as ex:
            # stop binary data receiving if exception occurred
            if not isinstance(ex, CancelledError):
                await self.video_transport_adapter.stop_receiving_binary_data()

            raise

