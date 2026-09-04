from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from logging import Logger
from multiprocessing import Pipe
from multiprocessing.shared_memory import SharedMemory
from typing import Callable, Dict, Any, Optional

from integration.decoding.messages import ProcessMessage, MessageTypes
from integration.decoding.types import CommandType


@dataclass(kw_only=True)
class ProcessorContext(ABC):
    command_type: CommandType
    creation_date: datetime = field(default_factory=datetime.now)

class MessageProcessor(ABC):

    @staticmethod
    def check_message_type(func) -> Callable:
        def wrapper(*args, **kwargs):
            if len(args) == 2:
                message = args[1]
            else:
                message = kwargs["message"]

            if message.type != MessageTypes.data:
                raise Exception("Wrong message type")

            return func(*args, **kwargs)

        return wrapper

    def __init__(
            self,
            sessions: Dict[str, Any],
            outer_logger: Logger,
            client_pipe: Pipe,
            client_shared_memory: SharedMemory
    ):
        self._sessions = sessions
        self._logger = outer_logger
        self._client_pipe = client_pipe
        self._client_shared_memory = client_shared_memory

    def init_session(self, message: ProcessMessage):
        raise NotImplementedError()

    @abstractmethod
    def process_message(self, message: ProcessMessage):
        raise NotImplementedError()

    @abstractmethod
    def clear_session(self, session_id: str, rack: Optional[str] = None, auto_clear: Optional[bool] = False):
        raise NotImplementedError()
