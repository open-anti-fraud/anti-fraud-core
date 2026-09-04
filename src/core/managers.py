import asyncio
import dataclasses
import datetime
import json
import uuid
from io import BytesIO
from typing import Tuple, Optional, List, Callable

from aiohttp import ClientSession
from anyio import create_task_group, get_cancelled_exc_class
from sqlalchemy.orm import Session

import settings
from core.business_logic.types import ContentInfo
from integration.database.managers import EndeavorManager
from integration.object_storage.models import S3Object, extension_to_s3_class_map
from integration.service.managers import ImageAPIManagerRealisation
from utils.exceptions import InvalidImageWithFace


class EndeavorManagerBL:
    inner_end_manager = EndeavorManager

    def __init__(self, session: Session):
        self.inner_end_manager = self.inner_end_manager(session)

    async def save_endeavor_content(
            self,
            endeavor_id: uuid.UUID,
            content: ContentInfo):
        s3_links = []

        try:
            for file in content.files:
                data_buffer = BytesIO(file.data)
                try:
                    if file.s3_class is None:
                        s3_class = extension_to_s3_class_map[file.extension]
                    else:
                        s3_class = file.s3_class

                    if file.name is None:
                        name = (f"{"error-" if content.exception_info is not None else ""}{content.type.name}"
                                f"-{datetime.datetime.now().strftime('%y-%m-%d-%H_%M_%S')}"
                                f"-{str(content.parent_id)[:5] if content.parent_id is not None else "no-parent"}"
                                f"-{str(endeavor_id)[:5]}"
                                f"-{str(content.id)[:5]}"
                                f".{file.extension}")
                    else:
                        name = file.name

                    s3_obj = s3_class(
                        name=name,
                        data=data_buffer
                    )

                    await s3_obj.save()

                    s3_links.append(s3_obj.s3_link)
                finally:
                    data_buffer.close()

            self.inner_end_manager.add_endeavor_content(
                content_id=content.id,
                endeavor_id=endeavor_id,
                parent_id=content.parent_id,
                content_type=content.type.value,
                s3_links=s3_links,
                info=content.info,
                exception_info=content.exception_info
            )
        except Exception:
            for link in s3_links:
                await S3Object.delete(link)

            raise


class ImageApiManagerBL:
    inner_ia_manager = ImageAPIManagerRealisation

    @dataclasses.dataclass
    class ProcessingResult:
        sample: Optional[dict]
        exception_list: List[Exception]
        marked_to_save: bool = False

        def handle_exception(self, ex):
            if isinstance(ex, ExceptionGroup):
                self.exception_list.extend(ex.exceptions)
            else:
                self.exception_list.append(ex)

        # for proper lambda work
        def handle_sample(self, sample: dict):
            if self.sample is not None:
                self.sample.update(sample)
            else:
                self.sample = sample

    @staticmethod
    def wrap_func(
            processing_result: ProcessingResult,
            timeout: int,
            wrap_result_handle: Callable[[ProcessingResult, dict], None],
            func: Callable
    ) -> Callable:
        func_name = func.__name__

        async def wrap(*args, **kwargs):
            try:
                try:
                    result = await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
                except TimeoutError:
                    # add text to timeout error
                    raise TimeoutError(f"{func_name} timeout")
                wrap_result_handle(processing_result, result)
            except (BaseException, get_cancelled_exc_class()) as ex:
                processing_result.handle_exception(ex)

        return wrap

    @classmethod
    async def get_template_info(cls, frame: bytes) -> Tuple[bytes, Optional[bytes]]:
        async with ClientSession() as session:
            fitter_response = await cls.inner_ia_manager.face_detector_face_fitter(frame, session)

            if len(fitter_response["objects"]) == 1:
                template_response = await cls.inner_ia_manager.face_detector_template_extractor(frame, session)
                base64_template_bsm = template_response["objects"][0]["template"]
                template_bsm = json.dumps(base64_template_bsm).encode()
            else:
                raise InvalidImageWithFace("No face or too many faces found on ref image")

            return frame, template_bsm

    @classmethod
    async def get_quality_info(
            cls,
            frame: bytes,
            processing_result: ProcessingResult,
            session: ClientSession
    ):
        await cls.wrap_func(
            processing_result,
            timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
            wrap_result_handle=lambda x, y: x.handle_sample(y),
            func=cls.inner_ia_manager.face_detector_face_fitter
        )(frame, session)

        # skip quality processing if exception occurred on fitter level
        if processing_result.exception_list:
            return None

        if len(processing_result.sample["objects"]) != 1:
            processing_result.handle_exception(InvalidImageWithFace("No face or too many faces found on ref image"))
        else:
            await cls.wrap_func(
                processing_result,
                timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                wrap_result_handle=lambda x, y: x.handle_sample(y),
                func=cls.inner_ia_manager.quality_estimator
            )(processing_result.sample, session)

        return None

    @classmethod
    async def get_ref_frame_info(
            cls,
            processing_result: ProcessingResult,
            session: ClientSession
    ):
        # skip quality processing if exception occurred on previous level
        if processing_result.exception_list:
            return None

        async with (create_task_group() as tg):
            tg.start_soon(
                cls.wrap_func(
                    processing_result,
                    timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                    wrap_result_handle=lambda x, y: x.sample["objects"][0].update(y["objects"][0]),
                    func=cls.inner_ia_manager.liveness_estimator
                ),
                processing_result.sample,
                session
            )
            tg.start_soon(
                cls.wrap_func(
                    processing_result,
                    timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                    wrap_result_handle=lambda x, y: x.sample["objects"][0].update(y["objects"][0]),
                    func = cls.inner_ia_manager.deepfake_estimator
                ),
                processing_result.sample,
                session
            )

        # mark result is chosen for saving to content object
        processing_result.marked_to_save = True

        return None


    @classmethod
    async def get_full_frame_info(
            cls,
            frame: bytes,
            processing_result: ProcessingResult,
            session: ClientSession
    ) -> None:
        await cls.wrap_func(
            processing_result,
            timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
            wrap_result_handle=lambda x, y: x.handle_sample(y),
            func=cls.inner_ia_manager.face_detector_face_fitter
        )(frame, session)

        # skip quality processing if exception occurred on fitter level
        if processing_result.exception_list:
            return None

        if len(processing_result.sample["objects"]) != 1:
            processing_result.handle_exception(InvalidImageWithFace("No face or too many faces found on ref image"))
        else:
            async with (create_task_group() as tg):
                tg.start_soon(
                    cls.wrap_func(
                        processing_result,
                        timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                        wrap_result_handle=lambda x, y: x.sample["objects"][0].update(y["objects"][0]),
                        func=cls.inner_ia_manager.quality_estimator
                    ),
                    processing_result.sample,
                    session
                )
                tg.start_soon(
                    cls.wrap_func(
                        processing_result,
                        timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                        wrap_result_handle=lambda x, y: x.sample["objects"][0].update(y["objects"][0]),
                        func=cls.inner_ia_manager.liveness_estimator
                    ),
                    processing_result.sample,
                    session
                )
                tg.start_soon(
                    cls.wrap_func(
                        processing_result,
                        timeout=settings.IMAGE_API_CALCULATION_TIMEOUT,
                        wrap_result_handle=lambda x, y: x.sample["objects"][0].update(y["objects"][0]),
                        func=cls.inner_ia_manager.deepfake_estimator
                    ),
                    processing_result.sample,
                    session
                )

        return None
