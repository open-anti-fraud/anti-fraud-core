from enum import Enum

class IncomingTransportMessages(str, Enum):
    packets_recording_mode = "packets"
    chunks_recording_mode = "chunks"