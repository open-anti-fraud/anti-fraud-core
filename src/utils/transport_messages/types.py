from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel

from utils.exceptions import ExceptionCode


class IncomingMessageType(Enum):
    handle_content = 0
    save_content = 1
    clear_content = 2
    data = 3


class OutcomingMessageType(str, Enum):
    message = 0
    data = 1
    exception = 2


class MsgBaseClass(BaseModel):
    def to_string(self) -> str:
        return self.model_dump_json()

class IncomingMessage(MsgBaseClass):
    type: IncomingMessageType
    body: Optional[Any] = None


class OutcomingMessage(MsgBaseClass):
    type: OutcomingMessageType
    body: Optional[Any] = None
    exception_code: Optional[ExceptionCode] = None