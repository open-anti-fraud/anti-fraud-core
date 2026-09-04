import json
import logging
import os
import uuid
from enum import Enum
from io import BytesIO

import numpy as np
from PIL import Image
from PIL.Image import SAVE

ROOT_PATH = os.environ.get('ROOT_PATH', '/')
APP_VERSION = os.environ['APP_VERSION']
CORS_ORIGINS = [origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()]

VIDEO_FOLDER = "videos"
TOKEN = os.environ['TOKEN']
SERVICE_KEY = os.environ['SERVICE_KEY']

SUB_DEBUG = json.loads(os.environ.get('SUB_DEBUG', 'False').lower())
SUB_LOGGERS = ["urllib3.connectionpool", "multipart.multipart"]
SUB_LOGGERS_LEVEL = logging.DEBUG if SUB_DEBUG else logging.WARNING

DISABLE_DATA_PERSISTENCE = int(os.environ.get('DISABLE_DATA_PERSISTENCE', 0))

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5433')
POSTGRES_DB = os.environ.get('POSTGRES_DB', 'lr-db')
POSTGRES_USER = os.environ.get('POSTGRES_USER', 'lr-user')
POSTGRES_PASSWORD = os.environ['POSTGRES_PASSWORD']
SQLALCHEMY_POOL_SIZE = int(os.environ.get('SQLALCHEMY_POOL_SIZE', "20"))
SQLALCHEMY_POOL_OVERFLOW = int(os.environ.get('SQLALCHEMY_POOL_OVERFLOW', "10"))

S3_DISABLE_INITIALIZATION = json.loads(os.environ.get('S3_DISABLE_INITIALIZATION', 'False').lower())
S3_HOST = os.environ.get('S3_HOST', '0.0.0.0')
S3_PORT = os.environ.get('S3_PORT', 9000)
S3_URL = f"{S3_HOST}:{S3_PORT}"
S3_USE_HTTPS = int(os.environ.get('S3_USE_HTTPS', 0))
S3_ACCESS_KEY = os.environ['S3_ACCESS_KEY']
S3_SECRET_KEY = os.environ['S3_SECRET_KEY']
S3_BUCKETS_PREFIX = os.environ.get('S3_BUCKETS_PREFIX', 'vr')
S3_DATA_RETENTION_DAYS = int(os.environ.get('S3_DATA_RETENTION_DAYS', 30))
S3_ERROR_DATA_RETENTION_DAYS = int(os.environ.get('S3_ERROR_DATA_RETENTION_DAYS', 3))
SAVE_ERROR_CONTENT = int(os.environ.get('SAVE_ERROR_CONTENT', 1))

ENABLE_TRACING = int(os.environ.get('ENABLE_TRACING', 0))
TRACING_HOST = os.environ.get('TRACING_HOST', "0.0.0.0")
TRACING_PORT = os.environ.get('TRACING_PORT', 4317)
TRACING_URL = f"http://{TRACING_HOST}:{TRACING_PORT}"
SERVICE_NAME = "video-recorder"

# from av.codec.codec import codecs_available
# from av.format import formats_available
# print(formats_available)

VIDEO_CONTAINER = os.environ.get('VIDEO_CONTAINER', 'mp4')
VIDEO_CODEC = os.environ.get('VIDEO_CODEC', 'vp9')
VIDEO_PIXEL_FORMAT = os.environ.get('VIDEO_PIXEL_FORMAT', 'yuv420p')
MAX_VIDEO_TIME = int(os.environ.get('MAX_VIDEO_TIME', 51_000))

START_FPS = int(os.environ.get('START_FPS', 9))
START_FRAME_PERIOD = 1000 // START_FPS
STABLE_FPS_FRAMES_COUNT = int(os.environ.get('STABLE_FPS_FRAMES_COUNT', 30))
FPS_WAIT_TIMEOUT_MS = int(os.environ.get('FPS_WAIT_TIMEOUT_MS', 10000))
START_BITRATE = int(os.environ.get('START_BITRATE', 1_500_000))
ENCODING_TIMEOUT = int(os.environ.get('ENCODING_TIMEOUT', 10))
REF_FRAME_TAKE_TIMEOUT = int(os.environ.get('ENCODING_TIMEOUT', 10))
MIN_ACTION_PATTERN_LENGTH = int(os.environ.get('MIN_ACTION_PATTERN_LENGTH', 1))
MAX_ACTION_PATTERN_LENGTH = int(os.environ.get('MAX_ACTION_PATTERN_LENGTH', 5))

class BucketEnum(Enum):
    # TODO rename buckets
    video = f"{f'{S3_BUCKETS_PREFIX}.' if S3_BUCKETS_PREFIX else ''}{'videos'}"
    image = f"{f'{S3_BUCKETS_PREFIX}.' if S3_BUCKETS_PREFIX else ''}{'ref-images'}"
    binary = f"{f'{S3_BUCKETS_PREFIX}.' if S3_BUCKETS_PREFIX else ''}{'ref-template-bsm'}"

ENABLE_IMAGE_API = int(os.environ.get('ENABLE_IMAGE_API', 1))

ENABLE_MEMORY_TRACE = int(os.environ.get('ENABLE_MEMORY_TRACE', 0))

# av1 hangs up
codec_container_map = {
    "mp4": ['libx264', 'libx265', 'vp9'],
    "avi": ['libxvid', 'vp9'],
    "matroska": ["libaom-av1"]
}

CODEC_OPTIONS = {
    "vp9": {
        "deadline": "realtime",
        "cpu-used": "6",  # 8 fastest, 6 quality balance
        "crf": "30",
        "b:v": "0",
        "an": "1",
        # "lossless": "1",
        "tiles": "4",
        "row-mt": "1"
    },
    "libaom-av1": {
        "crf": "30",
        "usage": "realtime",
        "cpu-used": "8",
        "row-mt": "1",
        "tiles": "4x1"
    }
}

ffmpeg_to_system = {
    "matroska": "mkv"
}

try:
    if VIDEO_CODEC not in codec_container_map[VIDEO_CONTAINER]:
        raise Exception("Provided codec not supported in container")
except KeyError:
    raise Exception("Container format unknown")

#CODEC_OPTIONS = codec_options_map.get(VIDEO_CODEC, {})
REF_IMAGE_FORMAT = "jpeg"

FACE_SDK_PATH = os.environ.get('FACE_SDK_PATH', "./face_sdk")

image_api_service_map = os.environ.get('IMAGE_API_SERVICE_MAP', {})
if image_api_service_map:
    image_api_service_map = json.loads(image_api_service_map)

WEBSOCKET_TIMEOUT = int(os.environ.get('WEBSOCKET_TIMEOUT', 60))
MESSAGE_WAIT_TIMEOUT = int(os.environ.get('MESSAGE_WAIT_TIMEOUT', 60))
JOB_SAVING_TIMEOUT = int(os.environ.get('JOB_SAVING_TIMEOUT', 10))
IMAGE_API_CALCULATION_TIMEOUT = int(os.environ.get('IMAGE_API_CALCULATION_TIMEOUT', 5))
CHUNK_DECODE_TIMEOUT = int(os.environ.get('CHUNK_DECODE_TIMEOUT', 10))
DEFAULT_AGGREGATE_ENTITY_TOKEN = os.environ.get('DEFAULT_AGGREGATE_ENTITY_TOKEN', "28608d66-a571-44ec-94db-04a00143ff51")

IMAGE_COMPRESS_LEVEL = int(os.environ.get('COMPRESS_LEVEL', 0))
IMAGE_FORMAT = os.environ.get('IMAGE_FORMAT', 'jpeg')

# initialize SAVE formats list
test_buf = BytesIO()
Image.fromarray(np.zeros((1, 1)), mode="RGB").save(test_buf, format='png', compress_level=0)
test_buf.close()

if IMAGE_FORMAT.upper() not in SAVE:
    raise Exception(f"Not supported image format."
                    f"\nPassed: {IMAGE_FORMAT.upper()}.\n"
                    f"Supported extensions: {SAVE.keys()}")

NULL_UUID = uuid.UUID('00000000-0000-0000-0000-000000000000')

#######################
## decoding settings ##
#######################

DECODING_ENABLED = int(os.environ.get('DECODING_ENABLED', 1))
DECODING_PROCESS_COUNT = int(os.environ.get('DECODING_PROCESS_COUNT', 5))
PROCESS_HUNG_TIMEOUT = int(os.environ.get('PROCESS_HUNG_TIMEOUT', 10))
AUTO_CLEAR_SESSION_LIFETIME = int(os.environ.get('AUTO_CLEAR_SESSION_LIFETIME', 600))
SKIP_INVALID_FRAMES_THRESHOLD = int(os.environ.get('SKIP_INVALID_FRAMES_THRESHOLD', 10))

# period in seconds when clear will trigger
CLEAR_SESSION_FREQUENCY = int(os.environ.get('CLEAR_SESSION_FREQUENCY', 600))

SHARED_MEMORY_SIZE_MB = int(os.environ.get('SHARED_MEMORY_SIZE_MB', 100)) * 1024 * 1024 # 100 MB
DECODING_TIMEOUT = int(os.environ.get('DECODING_TIMEOUT', 10))

PIPE_WAIT_TO_RETRY = float(os.environ.get('PIPE_WAIT_TO_RETRY', 0.1))
PIPE_RETRY_COUNT = int(os.environ.get('PIPE_RETRY_COUNT', 10))

SH_MEM_WAIT_TO_RETRY = float(os.environ.get('SH_MEM_WAIT_TO_RETRY', 0.1))
SH_MEM_RETRY_COUNT = int(os.environ.get('SH_MEM_RETRY_COUNT', 10))

# packet decoding settings

PACKET_BUFFER_SIZE = int(os.environ.get('PACKET_BUFFER_SIZE', 25))

# RETENTION_SETTINGS
RETENTION_CHECK_FREQUENCY = int(os.environ.get('RETENTION_CHECK_FREQUENCY', 3600))
RETENTION_S3_BATCH_PAUSE = float(os.environ.get('RETENTION_S3_BATCH_PAUSE', 0.3))
RETENTION_GLOBAL_BATCH_PAUSE = int(os.environ.get('RETENTION_GLOBAL_BATCH_PAUSE', 4))
RETENTION_BATCH_SIZE = int(os.environ.get('RETENTION_BATCH_SIZE', 83))
RETENTION_DEBUG = int(os.environ.get('RETENTION_DEBUG', 0))

RETENTION_SOCKET_FOLDER = os.environ.get('RETENTION_SOCKET_FOLDER', "ipc_worker")
RETENTION_WORKER_SOCKET_NAME = str(os.environ.get('RETENTION_WORKER_SOCKET_NAME', "ret_worker{0}.sock"))
RETENTION_WORKERS_COUNT = int(os.environ.get('RETENTION_WORKERS_COUNT', 1))

# REDIS for retention lock
REDIS_HOST = os.environ.get('REDIS_HOST', "0.0.0.0")
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))

# JWT
JWT_PUBLIC_KEY = os.environ.get('JWT_PUBLIC_KEY', "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHIgb6YWg2brsnJEzKvVREvVLh98WIkyykOqndJ3OBnSPEPJWjgZ8IknRy4YkhG5aVaduE1SI4bNczpabxdY5hQ==")
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', "ES256")
SESSION_JWT_ISSUER = os.environ.get('SESSION_JWT_ISSUER', "OPEN_ANTI_FRAUD")
BACKWARD_COMPATIBILITY_JWT_ISSUER = os.environ.get('BACKWARD_COMPATIBILITY_JWT_ISSUER', "OPEN_ANTI_FRAUD_BC")
JWT_CLOCK_SKEW = int(os.environ.get('JWT_CLOCK_SKEW', 1)) * 60 # in minutes

class AuthProvider(Enum):
    token = "token"
    jwt = "jwt"
    service_key = "service-key"
    no_check = "no-check"
    outer_jwt = "outer-jwt"


EXTERNAL_AUTH_PROVIDER: AuthProvider = AuthProvider(os.environ.get('EXTERNAL_AUTH_PROVIDER', "jwt"))
WS_AUTH_PROVIDER: AuthProvider = AuthProvider(os.environ.get('WS_AUTH_PROVIDER', "jwt"))
INTERNAL_AUTH_PROVIDER: AuthProvider = AuthProvider(os.environ.get('INTERNAL_AUTH_PROVIDER', "jwt"))
