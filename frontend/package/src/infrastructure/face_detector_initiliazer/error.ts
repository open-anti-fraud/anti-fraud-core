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

export class InitializationFaceDetectionServiceError extends WebComponentError {
    static readonly ERROR_NAME = 'InitializationFaceDetectionServiceError';
    public readonly code = '130003';

    constructor(message?: string) {
        super({
            message: message ?? 'Error initializing the face detection service',
        });
    }
}

export class NotSupportedDelegationModeError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedDelegationModeError';
    public readonly code = '1170007';

    constructor(message?: string) {
        super({
            message: message ?? 'Unsupported detector delegate mode',
        });
    }
}

export class NoTestFaceDetectorImageError extends WebComponentError {
    static readonly ERROR_NAME = 'NoTestFaceDetectorImageError';
    public readonly code = '1170008';

    constructor(message?: string) {
        super({
            message: message ?? 'No test image was found to test the operability of the face detector',
        });
    }
}

    
export class UnsupportFaceDetectorError extends WebComponentError {
    static readonly ERROR_NAME = 'UnsupportFaceDetectorError';
    public readonly code = '1170009';

    constructor(message?: string) {
        super({
            message:
                message ??
                'The face detector cannot be started because the device does not support any of the possible operating modes',
        });
    }
}