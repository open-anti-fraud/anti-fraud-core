import uuid
from http.client import CONFLICT

from miniopy_async import Minio
from miniopy_async.commonconfig import Filter, DISABLED, ENABLED
from miniopy_async.error import S3Error
from miniopy_async.lifecycleconfig import LifecycleConfig, Rule, Expiration

import settings
from utils import Singleton
from utils.correlation import get_logger
from utils.exceptions import DataSavingDisabled

logger = get_logger(__name__)

s3_client = None

class DummyMinioClient:
    def remove_object(self):
        raise DataSavingDisabled()

    def get_object(self):
        raise DataSavingDisabled()

    def put_object(self):
        raise DataSavingDisabled()

class MinioClient(metaclass=Singleton):
    s3_client = None

    def __init__(self):
        self.s3_client = Minio(
            settings.S3_URL,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=bool(settings.S3_USE_HTTPS)
        )
        self.bucket_lifecycle = LifecycleConfig(
            [
                Rule(
                    status=DISABLED,
                    rule_id=str(uuid.uuid4()),
                    expiration=Expiration(days=settings.S3_DATA_RETENTION_DAYS),
                    rule_filter=Filter(prefix=""),
                ),
                # error content deleted by minio bypassing main retention algorithm
                Rule(
                    status=ENABLED,
                    rule_id=str(uuid.uuid4()),
                    expiration=Expiration(days=settings.S3_ERROR_DATA_RETENTION_DAYS),
                    rule_filter=Filter(prefix="error"),
                )
            ]
        )

    async def init_base(self):
        for bucket_name in [element.value for element in settings.BucketEnum]:
            try:
                await self.s3_client.make_bucket(bucket_name)
            except S3Error as ex:  # workaround: if webserver starts several workers at once
                # https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList
                if ex.response.status != CONFLICT:
                    raise ex
                else:
                    logger.warning(msg=str(ex))

            await self.s3_client.set_bucket_lifecycle(bucket_name, self.bucket_lifecycle)


async def get_client():
    global s3_client

    if settings.DISABLE_DATA_PERSISTENCE:
        s3_client = DummyMinioClient()
    elif not settings.S3_DISABLE_INITIALIZATION and s3_client is None:
        client_wrap = MinioClient()
        await client_wrap.init_base()
        s3_client = client_wrap.s3_client

    return s3_client
