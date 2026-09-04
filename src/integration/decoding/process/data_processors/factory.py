from logging import Logger
from multiprocessing import Pipe
from multiprocessing.shared_memory import SharedMemory
from typing import Dict, Any


from integration.decoding.process.data_processors.processors.frame_to_image import FrameToImageProcessor
from integration.decoding.process.data_processors.processors.interface import MessageProcessor
from integration.decoding.process.data_processors.processors.packet_to_frames_and_video import PacketToFramesAndVideo
from integration.decoding.process.data_processors.processors.packet_to_video import PacketToVideo
from integration.decoding.process.data_processors.processors.video_to_frames import VideoToFramesProcessor
from integration.decoding.types import CommandType

class CommandProcessorFactory:
    processor_cmd_type_mapping: Dict[CommandType,  type[MessageProcessor]] = {
        CommandType.frame_to_image: FrameToImageProcessor,
        CommandType.video_to_frames: VideoToFramesProcessor,
        CommandType.packet_to_frames_and_video: PacketToFramesAndVideo,
        CommandType.packet_to_video: PacketToVideo
    }

    def __init__(
            self,
            sessions: Dict[str, Any],
            outer_logger: Logger,
            client_pipe: Pipe,
            client_shared_memory: SharedMemory
        ):
        self._sessions = sessions
        self._outer_logger = outer_logger
        self._client_pipe = client_pipe
        self._client_shared_memory = client_shared_memory
        self._processors_storage = {}

    def return_processor_by_command(self, command_type: CommandType) -> MessageProcessor:
        if (processor := self._processors_storage.get(command_type)) is not None:
            pass
        else:
            try:
                processor = self.processor_cmd_type_mapping[command_type](
                    self._sessions,
                    self._outer_logger,
                    self._client_pipe,
                    self._client_shared_memory
                )
            except KeyError:
                raise KeyError(f"Unknow command type: {command_type}. Not found any suitable processor")
            self._processors_storage[command_type] = processor


        return processor