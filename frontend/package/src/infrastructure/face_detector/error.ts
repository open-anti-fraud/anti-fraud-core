import { WebComponentError } from '../../shared';

export class NoWebGLSupportError extends WebComponentError {
    static readonly ERROR_NAME = 'NoWebGLSupportError';
    public readonly code = '1100001';

    constructor(message?: string) {
        super({
            message: message ?? 'WebGL is not supported in this browser',
        });
    }
}

export class FaceDetectorRunningError extends WebComponentError {
    static readonly ERROR_NAME = 'FaceDetectorRunningError';
    public readonly code = '1100004';

    constructor(message?: string) {
        super({
            message: message ?? 'Face detector is already running',
        });
    }
}

export class NoFaceDetectorError extends WebComponentError {
    static readonly ERROR_NAME = 'NoFaceDetectorError';
    public readonly code = '1100005';

    constructor(message?: string) {
        super({
            message: message ?? 'Face detector instance is not available',
        });
    }
}

export class FacialMovementsDuringInspectionError extends WebComponentError {
    static readonly ERROR_NAME = 'FacialMovementsDuringInspectionError';
    public readonly code = '190005';

    constructor(message?: string) {
        super({
            message: message ?? 'Excessive facial movements detected during inspection',
        });
    }
}

export class InvalidFrameDataForDetectionError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidFrameDataForDetectionError';
    public readonly code = '1400014';

    constructor(message?: string) {
        super({
            message: message ?? 'Incorrect frame data for face detection',
        });
    }
}
