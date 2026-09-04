from dataclasses import dataclass
from io import BytesIO
from typing import Optional

from aiohttp import ClientSession

import settings
from integration.object_storage import get_client
from integration.object_storage.utils import generate_s3_link, parse_s3_link


@dataclass
class S3Object:
    bucket_name = None

    def __init__(self, name: str, data: BytesIO, s3_link: Optional[str] = None):
        self.name: str = name
        self.data: BytesIO = data
        self.s3_link: Optional[str] = s3_link

    async def save(self):
        s3_client = await get_client()
        save_result = await s3_client.put_object(
            bucket_name=self.bucket_name,
            object_name=self.name,
            data=self.data,
            length=self.data.getbuffer().nbytes
        )
        self.s3_link = generate_s3_link(bucket_name=save_result.bucket_name, file_name=save_result.object_name)

    @classmethod
    async def get(cls, link: str):
        bucket_name, object_name = parse_s3_link(link)
        s3_client = await get_client()

        async with ClientSession() as session:
            http_result = await s3_client.get_object(
                session=session,
                bucket_name=bucket_name,
                object_name=object_name
            )
            file_io = BytesIO()
            async for data in http_result.content.iter_chunked(n=1024 * 1024):
                file_io.write(data)

        file_io.seek(0)

        return cls(name=object_name, data=file_io, s3_link=link)

    @classmethod
    async def delete(cls, link: str) -> None:
        bucket_name, object_name = parse_s3_link(link)
        s3_client = await get_client()
        await s3_client.remove_object(bucket_name, object_name)


class Image(S3Object):
    bucket_name = settings.BucketEnum.image.value


class Binary(S3Object):
    bucket_name = settings.BucketEnum.binary.value


class Video(S3Object):
    bucket_name = settings.BucketEnum.video.value


extension_to_s3_class_map = {
    "mp4": Video,
    "webm": Video,
    "jpeg": Image,
    "bin": Binary
}

def get_extension_from_s3_link(s3_link: str) -> str:
    return s3_link.rsplit(".", maxsplit=1)[1]

async def get_raw_object_by_s3_link(s3_link: str) -> bytes:
    return (await
        extension_to_s3_class_map[get_extension_from_s3_link(s3_link)].get(s3_link)
    ).data.read()