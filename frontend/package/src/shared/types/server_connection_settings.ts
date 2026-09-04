export type ServerConnectionSettingsBlock = {
    clientServerConnectionSettings: ClientServerConnectionSettings;
    livenessTransport: LivenessTransport;
};

export enum LivenessTransport {
    WEB_SOCKET = 'WebSocket',
}

export type ClientServerConnectionSettings = {
    videoRecordingApi: VideoRecordingApi;
    videoBitrate: number;
    idealVideoKeyFrameCountPerSecond: number;
    requiredReferenceFrameCount: number;
    referenceFrameQuality: number;
    switchToMediaRecoderApiAsFallback: boolean;
    transmissionWaitTimeout: number;
};

export enum VideoRecordingApi {
    WEB_CODEC = 'WebCodec',
    MEDIA_RECORDER = 'MediaRecorder',
}
