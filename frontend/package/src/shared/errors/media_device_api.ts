import { WebComponentError } from '../web_component_error';

export class AbortAccessToCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'AbortAccessToCameraError';
    public readonly code = '1400003';

    constructor(message?: string) {
        super({
            message: message ?? 'The attempt to access the camera was aborted',
        });
    }
}

export class DocumentIsNotFullyActiveError extends WebComponentError {
    static readonly ERROR_NAME = 'DocumentIsNotFullyActiveError';
    public readonly code = '1400004';

    constructor(message?: string) {
        super({
            message: message ?? 'HTML document is not fully active',
        });
    }
}

export class NotAllowedAccessToCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'NotAllowedAccessToCameraError';
    public readonly code = '120001';

    constructor(message?: string) {
        super({
            message: message ?? 'Not allowed access to camera',
        });
    }
}

export class NotFoundCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'NotFoundCameraError';
    public readonly code = '120002';

    constructor(message?: string) {
        super({
            message: message ?? 'No camera was found',
        });
    }
}

export class NotReadableCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'NotReadableCameraError';
    public readonly code = '120003';

    constructor(message?: string) {
        super({
            message: message ?? 'The camera is unavailable because it is already in use by another process',
        });
    }
}

export class OverconstrainedCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'OverconstrainedCameraError';
    public readonly code = '1400005';

    constructor(message?: string) {
        super({
            message: message ?? 'No camera was found that meets the system requirements',
        });
    }
}

export class CameraSecurityError extends WebComponentError {
    static readonly ERROR_NAME = 'CameraSecurityError';
    public readonly code = '1400006';

    constructor(message?: string) {
        super({
            message: message ?? 'Access to the camera was blocked due to an insecure connection',
        });
    }
}

export class MediaStreamIsUndefinedError extends WebComponentError {
    static readonly ERROR_NAME = 'MediaStreamIsUndefinedError';
    public readonly code = '1400010';

    constructor(message?: string) {
        super({ message });
    }
}
