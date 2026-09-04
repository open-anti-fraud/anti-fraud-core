import traceback
import uuid
from asyncio import CancelledError
from collections import defaultdict
from typing import Optional, List, Tuple

from aiohttp import ClientSession

from core.business_logic.content_handle_flows.flow_interfaces import BaseFlow
from core.business_logic.types import ContentInfo, ContentType, FileData
from core.managers import ImageApiManagerBL
from settings import NULL_UUID
from utils.exceptions import form_exception_traceback, InvalidImageWithFace

supress_to_warning_errors = {
    InvalidImageWithFace
}

class ReferenceImagesFlow(BaseFlow):
    @staticmethod
    def sort_quality(processing_result: ImageApiManagerBL.ProcessingResult) -> float:
        if processing_result.exception_list:
            return 0.0

        return processing_result.sample.get("objects", [{}])[0].get("quality", {}).get("total_score", 0.0)


    @staticmethod
    def image_data_parse(image_data: bytes) -> Tuple[Optional[uuid.UUID], Optional[int], Optional[int], Optional[int], bytes]:
        parent_id = uuid.UUID(image_data[:32].decode('utf8'))
        # switch parent_id to None if parent_id equal to NULL_UUID
        if parent_id == NULL_UUID:
            parent_id = None

        raw_frame_number = image_data[32:36]

        # switch frame_number to None if all bits equal to 1
        if all(b == 0xFF for b in raw_frame_number):
            frame_number = None
        else:
            frame_number = int.from_bytes(raw_frame_number)

        raw_yaw_angle  =  image_data[36:38]
        raw_pitch_angle = image_data[38:40]

        # switch angles to None if all bits equal to 1.
        # Assume if one angle is none than all angles is None
        if all(b == 0xFF for b in raw_yaw_angle):
            yaw_angle = None
            pitch_angle = None
        else:
            yaw_angle  =  int.from_bytes(raw_yaw_angle, signed=True)
            pitch_angle = int.from_bytes(raw_pitch_angle, signed=True)

        return parent_id, frame_number, yaw_angle, pitch_angle, image_data[40:]


    async def handling_task(self) -> Optional[List[ContentInfo]]:
        await self.video_transport_adapter.start_receiving_binary_data()

        # send transferring permitted signal
        await self.video_transport_adapter.send_message("Transferring permitted")

        try:
            suitable_processing_result = None
            suitable_content = None
            processing_exceptions_mapping = defaultdict(list)

            async with (ClientSession() as http_session):
                while True:
                    image_data = await self.video_transport_adapter.recv_binary_data()

                    if image_data is None:
                        break

                    self.logger.info("Receive reference frame")

                    try:
                        parent_id, frame_number, yaw_angle, pitch_angle, image_data = self.image_data_parse(image_data)
                    except Exception as ex:
                        self.logger.error(
                            "Error occurred while parsing image data: %s-%s\n%x",
                            type(ex).__name__,
                            ex,
                            form_exception_traceback(ex)
                        )
                        await self.video_transport_adapter.send_exception(ex)

                        suitable_content = ContentInfo(
                            type=ContentType.reference_frame,
                            files=[FileData(data=image_data, extension="bin")]
                        )
                        suitable_content.fill_exception_info(ex)
                        suitable_processing_result = None

                        continue

                    angles_data = [yaw_angle, pitch_angle] if yaw_angle is not None else None
                    suitable_content = ContentInfo(
                        type=ContentType.reference_frame,
                        files=[FileData(data=image_data,extension="jpeg")],
                        parent_id=parent_id,
                        info={"frame_number": frame_number, "angles": angles_data}
                    )

                    suitable_processing_result = ImageApiManagerBL.ProcessingResult(sample=None, exception_list=[])
                    await ImageApiManagerBL.get_quality_info(image_data, suitable_processing_result, http_session)

                    if (len(suitable_processing_result.exception_list) == 0 and
                        suitable_processing_result.sample["objects"][0]["quality"]["total_score"] > 0.30):
                        await self.video_transport_adapter.send_message("Suitable image found")
                        await self.video_transport_adapter.stop_receiving_binary_data()
                        break
                    else:
                        await self.video_transport_adapter.send_message("Image not suitable")

                # processing_result can be None if last passed image failed to parce binary data
                if suitable_processing_result is not None:
                    if len(suitable_processing_result.exception_list) == 0:
                        await ImageApiManagerBL.get_ref_frame_info(suitable_processing_result, http_session)

                    # check errors again because get_ref_frame_info processing can create new
                    if len(suitable_processing_result.exception_list) == 0:
                        # fill processing info in content
                        suitable_content.info["image_info"] = {
                            "quality": suitable_processing_result.sample["objects"][0]["quality"],
                            "liveness": suitable_processing_result.sample["objects"][0]["liveness"],
                            "deepfake": suitable_processing_result.sample["objects"][0]["deepfake"]
                        }

                    # send to client exceptions occurred while processing samples and update content objects with it
                    for exception in suitable_processing_result.exception_list:
                        traceback_string = "".join(
                            traceback.format_exception(
                                type(exception),
                                exception,
                                exception.__traceback__
                            )
                        )
                        exception_class_name = type(exception).__name__
                        exception_text = str(exception)

                        if type(exception) not in supress_to_warning_errors:
                            self.logger.error(
                                "Error occurred while processing image: %s-%s\n%s",
                                exception_class_name,
                                exception_text,
                                traceback_string
                            )
                        else:
                            self.logger.warning(
                                "Warning occurred while processing image: %s-%s",
                                exception_class_name,
                                exception_text
                            )

                        processing_exceptions_mapping[0].append(exception)
                        # only last exception in list will be in content info for simplicity
                        suitable_content.fill_exception_info(exception)

            await self.video_transport_adapter.send_message(
                "Frames handled"
            )

            if processing_exceptions_mapping:
                await self.video_transport_adapter.send_exception_mapping(
                    processing_exceptions_mapping
                )
            else:
                await self.video_transport_adapter.send_message(
                    "No exceptions occurred"
                )

            # clear files field before sending info to client
            await self.video_transport_adapter.send_info(
                data=[
                    ContentInfo(
                        parent_id=suitable_content.parent_id,
                        info=suitable_content.info,
                        exception_info=suitable_content.exception_info,
                        type=suitable_content.type,
                        files=[]
                    )
                ]
            )
            return [suitable_content]

        except Exception as ex:
            # stop binary data receiving if exception occurred
            if not isinstance(ex, CancelledError):
                await self.video_transport_adapter.stop_receiving_binary_data()

            raise