import json
import logging
import os
from typing import Optional

from uvicorn.config import LOGGING_CONFIG

DEBUG = json.loads(os.environ.get('DEBUG', 'False').lower())
LOGGING_LEVEL = logging.DEBUG if DEBUG else logging.INFO

BASE_LOGGING_FORMAT = '%(asctime)s|%(levelname)s|%(name)s'

LOGGING_FORMAT = f"{BASE_LOGGING_FORMAT}|%(message)s"
ACCESS_LOGGING_FORMAT = f"{BASE_LOGGING_FORMAT}|%(client_addr)s - \"%(request_line)s\" %(status_code)s"

def get_logger(
        name: str,
        logger_format: Optional[logging.Formatter] = None
) -> logging.Logger:
    if logger_format is None:
            logger_format = logging.Formatter(LOGGING_FORMAT)

    sh = logging.StreamHandler()
    sh.setFormatter(logger_format)

    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False
    logger.addHandler(sh)

    return logger
