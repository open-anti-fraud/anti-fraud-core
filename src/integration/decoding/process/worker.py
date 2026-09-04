import logging
import multiprocessing
import os
import sys
from datetime import datetime, timedelta
from multiprocessing import Process
from multiprocessing.shared_memory import SharedMemory
from typing import Dict

import settings
from integration.decoding.messages import MessageTypes, ProcessMessage
from integration.decoding.process.data_processors.factory import CommandProcessorFactory
from integration.decoding.process.data_processors.processors.interface import ProcessorContext
from integration.decoding.utils import (blocking_retry_send, blocking_retry_recv)
from utils import LOGGING_FORMAT, LOGGING_LEVEL
from utils.correlation import BASE_LOGGING_FORMAT, get_logger
from utils.exceptions import DecodingProcessCriticalError


class DecodingProcessWorker(Process):

    def __init__(self,
                 send_pipe: multiprocessing.Pipe,
                 recv_pipe: multiprocessing.Pipe,
                 transfer_memory_name: str):
        super().__init__()
        self.send_pipe = send_pipe
        self.recv_pipe = recv_pipe
        self.transfer_memory = SharedMemory(name=transfer_memory_name)
        self.sessions: Dict[str, ProcessorContext] = {}
        self.logger = None
        self.last_clear_time = datetime.now()

    def _init_logging(self):
        logging.basicConfig(format=LOGGING_FORMAT, level=LOGGING_LEVEL)

        formatter = logging.Formatter(
            f'{BASE_LOGGING_FORMAT}|PID: {os.getpid()}|%(message)s'
        )

        self.logger = get_logger(
            __name__,
            formatter
        )

    def _init_command_processor(self):
        self.command_processor_factory = CommandProcessorFactory(
            self.sessions,
            self.logger,
            self.send_pipe,
            self.transfer_memory
        )

    def _auto_clear_sessions(self):
        """
        Clearing old sessions that were created more than AUTO_CLEAR_SESSION_TIME seconds ago and have not been deleted for any reason.
        """
        keys = list(self.sessions.keys())
        clear_session_count = 0

        for key in keys:
            session_info = self.sessions[key]
            processor = self.command_processor_factory.return_processor_by_command(session_info.command_type)

            if datetime.now() - session_info.creation_date >= timedelta(seconds=settings.AUTO_CLEAR_SESSION_LIFETIME):
                processor.clear_session(key, auto_clear=True)
                clear_session_count += 1

        message = f"Clear {clear_session_count} hung sessions"
        if clear_session_count > 0:
            self.logger.warning(message)
        else:
            self.logger.info(message)

    def run(self):
        # move logger init on process level
        self._init_logging()
        self._init_command_processor()

        self.logger.info(
            f"Start process. Send pipe: {self.send_pipe.fileno()}. "
            f"Recv pipe: {self.recv_pipe.fileno()}. "
            f"Shared memory: {self.transfer_memory.name}. "
        )

        # flush process output
        sys.stdout.flush()

        try:
            break_cycle = False

            while True:
                try:
                    # trigger clear function
                    if (
                            (current_date := datetime.now()) - self.last_clear_time >=
                            timedelta(seconds=settings.CLEAR_SESSION_FREQUENCY)
                    ):
                        self.last_clear_time = current_date
                        self._auto_clear_sessions()
                except Exception as ex:
                    self.logger.error(
                        f"Exception occurred while performing auto clear. {type(ex).__name__}-{ex}", exc_info=True
                    )
                    break_cycle = True

                try:
                    message: ProcessMessage = blocking_retry_recv(self.recv_pipe)
                    message_type = message.type
                except KeyboardInterrupt:
                    # close process on keyboard interrupt
                    return
                except Exception as ex:
                    self.logger.error(f"Exception occurred while receiving message. {type(ex).__name__}-{ex}", exc_info=True)
                    # close process
                    return

                # Message must be received from process manager side otherwise process manager will hang up
                if break_cycle:
                    # send error to manager that signal process is unstable and must be restarted
                    blocking_retry_send(
                        self.send_pipe,
                        DecodingProcessCriticalError("Fatal exception occurred in process handling cycle")
                    )
                    return

                try:
                    processor = self.command_processor_factory.return_processor_by_command(message.command)

                    if message_type == MessageTypes.clear:
                        processor.clear_session(message.session_id, message.rack)
                    elif message_type == MessageTypes.init_session:
                        processor.init_session(message)
                    elif message_type == MessageTypes.data:
                        processor.process_message(message)
                    else:
                        self.logger.error(f"Unknown message type")
                        blocking_retry_send(self.send_pipe, Exception("Unknown message type"))

                except Exception as ex:
                    self.logger.error(f"Exception occurred in process. {type(ex).__name__}-{ex}", exc_info=True)
                    blocking_retry_send(self.send_pipe, ex)
                finally:
                    # flush process output
                    sys.stdout.flush()
        finally:
            self.recv_pipe.close()
            self.send_pipe.close()
