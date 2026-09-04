import { WebComponentError } from '../web_component_error';

export class TransmissionTimeoutError extends WebComponentError {
    static readonly ERROR_NAME = 'TransmissionTimeoutError';
    public readonly code = '1400023';

    constructor(message?: string) {
        super({
            message: message ?? 'The waiting time for a response from the server has been exceeded',
        });
    }
}

export class InvalidFacesAmountOnFrameError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidFacesAmountOnFrameError';
    public readonly code = '120060';

    constructor(message?: string) {
        super({
            message: message ?? 'Invalid faces amount on frame',
        });
    }
}

export class InvalidMessageFormatError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidMessageFormatError';
    public readonly code = '1120001';

    constructor(message?: string) {
        super({
            message: message ?? 'Wrong message format',
        });
    }
}

export class NotSupportedApiError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedApiError';
    public readonly code = '1400007';

    constructor(message?: string) {
        super({
            message: message ?? 'API is not supported in this environment',
        });
    }
}

export class CameraFpsNotDefinedError extends WebComponentError {
    static readonly ERROR_NAME = 'CameraFpsNotDefinedError';
    public readonly code = '1400022';

    constructor(message?: string) {
        super({
            message: message ?? 'Camera FPS is not defined',
        });
    }
}

export class CameraResolutionNotDefinedError extends WebComponentError {
    static readonly ERROR_NAME = 'CameraResolutionNotDefinedError';
    public readonly code = '14000025';

    constructor(message?: string) {
        super({
            message: message ?? 'Camera resolution is not defined',
        });
    }
}

export class VideoStreamResolutionIsUndefinedError extends WebComponentError {
    static readonly ERROR_NAME = 'VideoStreamResolutionIsUndefinedError';
    public readonly code = '1400012';

    constructor(message?: string) {
        super({
            message: message ?? 'Video stream resolution is undefined',
        });
    }
}

export class InvalidVideoStreamResolutionValueError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidVideoStreamResolutionValueError';
    public readonly code = '1400013';

    constructor(message?: string) {
        super({
            message:
                message ??
                'The resolution of the video stream contains invalid values, the width or height of the video stream cannot be equal to 0',
        });
    }
}

export class InvalidVideoPreviewResolutionValueError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidVideoPreviewResolutionValueError';
    public readonly code = '1400013';

    constructor(message?: string) {
        super({
            message:
                message ??
                'The resolution of the video preview contains invalid values, the width or height of the video preview cannot be equal to 0',
        });
    }
}

export class ApplicantBlockedError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantBlockedError';
    public readonly code = '1150005';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant is blocked',
        });
    }
}

export class TransportError extends WebComponentError {
    static readonly ERROR_NAME = 'TransportError';
    public readonly code: string;

    constructor({ message, code }: { message?: string; code: string }) {
        super({ message });
        this.code = code;
    }
}

export class CaptureFaceBestshotTimeoutError extends WebComponentError {
    static readonly ERROR_NAME = 'CaptureFaceBestshotTimeoutError';

    constructor(message?: string) {
        super({
            message: message ?? 'Face bestshot capture exceeded the allowed time limit',
        });
    }
}

export class InvalidTokenError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidTokenError';
    public readonly code = '120050';

    constructor(message?: string) {
        super({
            message: message ?? 'Invalid token',
        });
    }
}
