import traceback
from enum import Enum
from typing import Tuple

from fastapi import HTTPException
from pydantic import ValidationError


class ExceptionCode(str, Enum):
    # 116*** video-recorder service code that not mapped to user
    wrong_s3_link = "116001"
    invalid_image_with_face = "120060"
    unsupported_content_type = "180003"
    wrong_message_format = "1120001"
    job_timeout = "1120002"
    exception_occurred = "1120003"
    exception_mapping = "116002"
    invalid_mc_reference_image_count = "1170002"

def exception_to_message_with_code(exception: BaseException) -> Tuple[str, ExceptionCode]:
    if isinstance(exception, ExceptionWithCode):
        exception_message = exception.message
        exception_code = exception.code
    elif isinstance(exception, ValidationError):
        exception_message = str(exception)
        exception_code = ExceptionCode.wrong_message_format
    else:
        exception_message = f"{type(exception).__name__}-{str(exception)}"
        exception_code = ExceptionCode.exception_occurred

    return exception_message, exception_code

def exception_to_dict(ex) -> dict:
    message, code = exception_to_message_with_code(ex)

    return {
        "message": message,
        "code": code
    }


def form_exception_traceback(exception: Exception) -> str:
    return "".join(traceback.format_exception(
        type(exception),
        exception,
        exception.__traceback__
    ))


def form_content_exception_info(exception: Exception) -> dict:
    traceback_info = None
    if type(exception) not in no_traceback_exceptions:
        traceback_info = form_exception_traceback(exception)

    return {
        "type": type(exception).__name__,
        "text": str(exception),
        "traceback": traceback_info
    }


class ExceptionWithCode(Exception):
    _400_codes = {ExceptionCode.wrong_s3_link, ExceptionCode.invalid_image_with_face}

    def __init__(self, message: str, code: ExceptionCode):
        super().__init__(message)
        self.message = message
        self.code = code

    def __str__(self):
        return f"Message: {self.message} Code: {self.code.value}"

    def to_http_exception(self):
        data = {"message": self.message, "code": self.code}
        if self.code in self._400_codes:
            return HTTPException(detail=data, status_code=400)
        else:
            return HTTPException(detail=data, status_code=500)

class InvalidImageWithFace(ExceptionWithCode):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code=ExceptionCode.invalid_image_with_face
        )

class InvalidSortOrder(Exception):
    pass

class PrimaryKeyAlreadyExist(Exception):
    pass

class InvalidToken(Exception):
    def __init__(self):
        super().__init__("Token invalid")

class WebSocketTimeout(Exception):
    pass

class NoJobResult(Exception):
    def __init__(self):
        super().__init__("No job result")

class RecordingAbortByComponent(Exception):
    pass

class WrongTypeWsMessage(Exception):
    pass

class DecoderException(Exception):
    pass

class UnexpectedMessageType(Exception):
    pass

class DataSavingDisabled(Exception):
    pass

# WS EXCEPTIONS

class ComponentTimeouts(Exception):
    pass

class ComponentMessageSendTimeout(ComponentTimeouts):
    pass

class ComponentBinaryDataSendTimeout(ComponentTimeouts):
    pass

class ComponentPacketDataSendTimeout(ComponentTimeouts):
    pass

class ComponentVideoChunkDataSendTimeout(ComponentTimeouts):
    pass

class NoVideoTransferred(Exception):
    pass


# DECODING MANAGER EXCEPTIONS

class FreeProcessObtainTimeout(Exception):
    pass

class PipeMessageReceiveTimeout(Exception):
    pass

# DECODING PROCESS ERRORS

class DecodingProcessCriticalError(Exception):
    pass

# retention socket exception

class SocketAnswerError(Exception):
    pass

class SocketMessageParseError(Exception):
    pass

class WrongS3Link(ExceptionWithCode):
    def __init__(self):
        super().__init__(
            message="Wrong s3 link",
            code=ExceptionCode.wrong_s3_link
        )


class UnsupportedContentType(ExceptionWithCode):
    def __init__(self):
        super().__init__(
            message="Unsupported content type",
            code=ExceptionCode.unsupported_content_type
        )


class VideoJobTimeout(ExceptionWithCode):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code=ExceptionCode.job_timeout
        )


class McReferenceImageCount(ExceptionWithCode):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code=ExceptionCode.invalid_mc_reference_image_count
        )

no_traceback_exceptions = {
    InvalidImageWithFace
}