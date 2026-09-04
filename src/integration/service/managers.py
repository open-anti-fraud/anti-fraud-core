from abc import ABC, abstractmethod
from io import BytesIO

from aiohttp import FormData, ClientSession

import settings


class ImageApiManagerInterface(ABC):
    @staticmethod
    async def _handle_image_api_response(response) -> dict:
        try:
            result_json = await response.json()
        except ValueError:
            response.raise_for_status()

        if response.status >= 400:
            if (detail := result_json.get("detail")) is not None:  # noqa
                raise Exception(detail)
            else:
                raise Exception(str(result_json))

        return result_json

    @classmethod
    @abstractmethod
    async def face_detector_template_extractor(cls, image: bytes, session: ClientSession) -> dict:
        raise NotImplementedError()

    @classmethod
    @abstractmethod
    async def face_detector_face_fitter(cls, image: bytes, session: ClientSession) -> dict:
        raise NotImplementedError()

    @classmethod
    @abstractmethod
    async def quality_estimator(cls, sample: dict, session: ClientSession) -> dict:
        raise NotImplementedError()

    @classmethod
    @abstractmethod
    async def liveness_estimator(cls, sample: dict, session: ClientSession):
        raise NotImplementedError()

    @classmethod
    @abstractmethod
    async def deepfake_estimator(cls, sample: dict, session: ClientSession):
        raise NotImplementedError()


class ImageApiManager(ImageApiManagerInterface):
    image_api_version = 'v2'

    @classmethod
    async def face_detector_template_extractor(cls, image: bytes, session: ClientSession) -> dict:
        service_url = settings.image_api_service_map['face-detector-template-extractor']
        data = FormData()
        data.add_field("image", image, filename="image.jpg", content_type="image/jpeg")
        async with session.post(
                url=f"{service_url}/{cls.image_api_version}/process/image",
                data=data
        ) as response:
            result = await cls._handle_image_api_response(response)
            return result

    @classmethod
    async def face_detector_face_fitter(cls, image: bytes, session: ClientSession) -> dict:
        service_url = settings.image_api_service_map['face-detector-face-fitter']
        data = FormData()
        data.add_field("image", image, filename="image.jpg", content_type="image/jpeg")

        async with session.post(
                url=f"{service_url}/{cls.image_api_version}/process/image",
                data=data
        ) as response:
            result = await cls._handle_image_api_response(response)
            return result

    @classmethod
    async def quality_estimator(cls, sample: dict, session: ClientSession) -> dict:
        service_url = settings.image_api_service_map['quality-core']
        async with session.post(
                url=f"{service_url}/{cls.image_api_version}/process/sample",
                json=sample,
        ) as response:
            result = await cls._handle_image_api_response(response)
            return result

    @classmethod
    async def liveness_estimator(cls, sample: dict, session: ClientSession):
        service_url = settings.image_api_service_map['liveness-estimator']

        async with session.post(
                url=f"{service_url}/{cls.image_api_version}/process/sample",
                json=sample,
        ) as response:
            result = await cls._handle_image_api_response(response)
            return result

    @classmethod
    async def deepfake_estimator(cls, sample: dict, session: ClientSession):
        service_url = settings.image_api_service_map['deepfake-estimator']

        async with session.post(
                url=f"{service_url}/{cls.image_api_version}/process/sample",
                json=sample,
        ) as response:
            result = await cls._handle_image_api_response(response)
            return result

class DummyImageApiManager(ImageApiManagerInterface):
    @classmethod
    async def face_detector_template_extractor(cls, image: BytesIO, session: ClientSession) -> dict:
        return {
            "objects": [
                {"template": {"data": "wow"}}
            ]
        }

    @classmethod
    async def face_detector_face_fitter(cls, image: BytesIO, session: ClientSession) -> dict:
        return {
            "objects": [
                {"some_stub": 1}
            ]
        }

    @classmethod
    async def quality_estimator(cls, sample: dict, session: ClientSession) -> dict:
        return {
            "objects": [
                {
                    "quality": {
                        "value": True,
                        "failed_checks": None
                    }
                }
            ]
        }

    @classmethod
    async def liveness_estimator(cls, sample: dict, session: ClientSession):
        return {
            "objects": [{
                "liveness": {
                    "attack_type_scores": {
                      "none": 0.9976844926108148,
                      "replay": 0.000017247781153810615,
                      "photo": 6.817447664753431e-7,
                      "regions": 0.0021378681202090894,
                      "2d_mask": 0.00012345161748728508,
                      "3d_mask": 0.00003625812556851821
                    },
                    "confidence": 0.9976844926108148,
                    "attack_type": "none",
                }
            }]
        }

    @classmethod
    async def deepfake_estimator(cls, sample: dict, session: ClientSession):
        return {
            "objects": [{
                "deepfake": {
                    "confidence": 0.09
                }
            }]
        }

if settings.ENABLE_IMAGE_API:
    ImageAPIManagerRealisation: ImageApiManagerInterface = ImageApiManager
else:
    ImageAPIManagerRealisation: ImageApiManagerInterface = DummyImageApiManager
