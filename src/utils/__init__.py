import logging
from io import BytesIO
from typing import AsyncGenerator, Optional

from pydantic.alias_generators import to_snake
from uvicorn.config import LOGGING_CONFIG

import settings
from utils.correlation import LOGGING_LEVEL, LOGGING_FORMAT, ACCESS_LOGGING_FORMAT


class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


def to_snake_dict(dictionary):
    result_ = {}
    for key, value in dictionary.items():
        result_[to_snake(key)] = value

    return result_

extension_to_mime = {
    "mp4": "video",
    "webm": "video",
    "jpeg": "image"
}

def get_stream_func(data: bytes, chunk_size: int):
    async def stream_func() -> AsyncGenerator[bytes]:
        buffer = BytesIO(data)
        try:
            while chunk := buffer.read(chunk_size):
                yield chunk
        finally:
            buffer.close()

    return stream_func


def deep_update(original_dict: dict, update_dict: dict, ignore_none: Optional[bool] = False):
    def check_values(index, old_value, new_value, original_obj) -> None:
        new_type = type(new_value)
        old_type = type(old_value)

        if new_type != old_type:
            original_obj[index] = new_value

        if new_type == dict or new_type == list:
            recursion(old_value, new_value)
        else:
            original_obj[index] = new_value

    def recursion(old_obj, new_obj):
        if type(old_obj) != type(new_obj):
            raise Exception(
                "Different types are provided for merge. It is impossible to unambiguously resolve this case"
            )

        if isinstance(old_obj, list):
            for index, element in enumerate(new_obj):
                if element is None and ignore_none:
                    continue

                if index >= len(old_obj):
                    old_obj.append(element)
                else:
                    old_value = old_obj[index]

                    check_values(
                        index=index,
                        old_value=old_value,
                        new_value=element,
                        original_obj=old_obj,
                    )

        if isinstance(old_obj, dict):
            for key, value in new_obj.items():
                if value is None and ignore_none:
                    continue

                old_value = old_obj.get(key)

                if old_value is None:
                    old_obj[key] = value
                else:
                    check_values(
                        index=key,
                        old_value=old_value,
                        new_value=value,
                        original_obj=old_obj,
                    )

    recursion(original_dict, update_dict)

def setup_logging():
    log_conf = LOGGING_CONFIG
    log_conf["formatters"]["default"]["fmt"] = LOGGING_FORMAT
    log_conf["formatters"]["access"]["fmt"] = ACCESS_LOGGING_FORMAT

    log_conf["loggers"] = {
        "uvicorn": {"handlers": ["default"], "level": logging._levelToName[LOGGING_LEVEL], "propagate": False},
        "uvicorn.error": {
            "handlers": ["default"],
            "level": logging._levelToName[LOGGING_LEVEL],
            "propagate": False
        },
        "uvicorn.access": {
            "handlers": ["access"],
            "level": logging._levelToName[LOGGING_LEVEL],
            "propagate": False
        },
    }
    logging.basicConfig(format=LOGGING_FORMAT, level=LOGGING_LEVEL)

    # set formater to all loggers
    for name in logging.root.manager.loggerDict:
        logger = logging.getLogger(name)
        for handler in logger.handlers:
            handler.setFormatter(logging.Formatter(LOGGING_FORMAT))

    # dedicate setup some loggers
    logging.getLogger("uvicorn.error").setLevel(LOGGING_LEVEL)
    logging.getLogger("gunicorn.error").setLevel(LOGGING_LEVEL)

    sub_loggers = [logging.getLogger(logger_name) for logger_name in settings.SUB_LOGGERS]
    for logger_ in sub_loggers:
        logger_.setLevel(settings.SUB_LOGGERS_LEVEL)
