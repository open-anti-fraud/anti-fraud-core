import { LivenessTransport, VideoRecordingApi } from '../types';

export const DEFAULT_LIVENESS_TRANSPORT = LivenessTransport.WEB_SOCKET;

export const DEFAULT_SHOW_NETWORK_METRICS: boolean = true;
export const DEFAULT_OBTAIN_REFERENCE_FRAME: boolean = true;

export const DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS = {
    videoRecordingApi: VideoRecordingApi.MEDIA_RECORDER,
    videoBitrate: 1000000,
    idealVideoKeyFrameCountPerSecond: 3,
    requiredReferenceFrameCount: 10,
    referenceFrameQuality: 90,
    switchToMediaRecoderApiAsFallback: false,
    transmissionWaitTimeout: 10_000,
};
