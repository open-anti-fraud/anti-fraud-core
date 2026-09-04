from enum import Enum

class VrMetrics(Enum):
    WebsocketConnectionCount = "vr_websocket_connection_count"
    WebsocketAverageConnectionDuration = "vr_websocket_average_connection_duration"
    WebsocketAverageVideoChunkSize = "vr_websocket_average_chunk_size"
