export const Events = {
    VIDEO_FRAME_RECEIVED: 'tdv-video-frame-received-event',
    ENCODED_FRAME_RECEIVED: 'tdv-encoded-video-frame-received-event',
    DETECTOR_PROCESSED_FRAME: 'tdv-frame-processed-by-face-detector-event',
    MOTION_CONTROL_FACE_POSITION_VALIDATION: 'tdv-motion-control-face-position-validation-event',
    MOTION_CONTROL_ACTION: 'tdv-motion-control-action-event',
    FAILED_MOTION_CONTROL: 'tdv-failed-motion-control-event',
    PROCESSING_VIDEO_STREAM_ERROR: 'tdv-processing-stream-error',
    WEB_COMPONENT_ERROR_EVENT_NAME: 'tdvc-web-component-error-event',
} as const;
