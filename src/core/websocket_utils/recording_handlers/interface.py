from abc import abstractmethod, ABC
from typing import Optional, Tuple


class RecordingInterface(ABC):

    @abstractmethod
    def stop_recording(self):
        pass

    @abstractmethod
    async def recording_task(self, start_data: Optional[bytes] = None) -> Tuple[Optional[bytes], Optional[Exception]]:
        pass