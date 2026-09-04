export enum ProcessingStreamServiceMessages {
    INITIALIZE = 'initializing_stream_processor',
    SEND_VIDEO_METADATA = 'send_stream_metadata',
    SEND_ENCODING_METADATA = 'send_encoding_metadata',
    SET_VIDEO_ID = 'set_video_id',
    START_PROCESSING = 'start_processing_stream',
    STOP_PROCESSING = 'stop_processing_stream',
    HANDLE_VIDEO_FRAME = 'send_video_frame',
    START_RECODING = 'start_recoding_video',
    STOP_RECODING = 'stopped_recoding_video',
    AVERAGE_FRAME_DETECTION_TIME = 'average_frame_detection_time',
    DESTROY = 'destroy',
}

export enum WorkerAnswer {
    LOADED = 'loaded',
    INITIALIZED = 'stream_processor_initialized',
    VIDEO_FRAME_HANDLED = 'frame_handled',
    STOPPED_PROCESSING = 'stopped_of_processing_stream_message',
    STOPPED_RECODING = 'stopped_recoding_video',
    RAW_FRAME_RECEIVED = 'frame_received_from_stream',
    ENCODED_FRAME_RECEIVED = 'encoded_frame_has_been_received',
    DESTROYED = 'destroyed',
    ERROR = 'worker_error',
    AVERAGE_FRAME_DETECTION_TIME_SETTLED = 'Average face detection time for worker has been settled',
}
