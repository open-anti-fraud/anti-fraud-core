from typing import Optional, Any, Union

from utils.exceptions import ExceptionCode, exception_to_message_with_code
from utils.transport_messages.types import IncomingMessage, OutcomingMessage, OutcomingMessageType


class MessageProcessor:
    @staticmethod
    def parse_incoming_message(message: Union[str|dict]) -> IncomingMessage:
        if type(message) == str:
            return IncomingMessage.model_validate_json(message)
        else:
            return IncomingMessage.model_validate(message)

    @staticmethod
    def build_outcoming_message(
            msg_type: OutcomingMessageType,
            body: Optional[Any] = None,
            exc_code: Optional[ExceptionCode] = None) -> OutcomingMessage:
        return OutcomingMessage(
            type=msg_type,
            body=body,
            exception_code=exc_code
        )

    @classmethod
    def form_exception_message(cls, ex: BaseException):
        message, exc_code = exception_to_message_with_code(ex)

        return cls.build_outcoming_message(
            OutcomingMessageType.exception,
            message,
            exc_code
        )
