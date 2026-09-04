import { CameraResolutionDimensions, CameraResolutions, CameraSettings } from '../types';

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
    cameraResolution: CameraResolutions.HD,
    cameraId: undefined,
    autoSubmit: false,
    permissionInBrowserTimeout: 30_000,
};

export const ResolutionsDimensions: CameraResolutionDimensions = {
    [CameraResolutions.FULL_HD]: { width: 1920, height: 1080 },
    [CameraResolutions.HD]: { width: 1280, height: 720 },
    [CameraResolutions.SD]: { width: 640, height: 360 },
};

export enum CameraErrors {
    ABORT = 'AbortError',
    INVALID_STATE = 'InvalidStateError',
    NOT_ALLOWED = 'NotAllowedError',
    NOT_FOUND = 'NotFoundError',
    NOT_READABLE = 'NotReadableError',
    OVER_CONSTRAINED = 'OverconstrainedError',
    SECURITY = 'SecurityError',
}
