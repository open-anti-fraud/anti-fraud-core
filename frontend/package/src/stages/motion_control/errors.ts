import { WebComponentError } from '../../shared';

export class DisabledFaceDetectorError extends WebComponentError {
    static readonly ERROR_NAME = 'DisabledFaceDetectorError';

    constructor(message?: string) {
        super({
            message: message ?? 'Disabled face detector',
        });
    }
}

export class NoSupportedVideoCodecError extends WebComponentError {
    static readonly ERROR_NAME = 'NoSupportedVideoCodecError';
    public readonly code = '1400017';

    constructor(message?: string) {
        super({
            message: message ?? 'No supported video codec available',
        });
    }
}

export class InvalidVideoDataError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidVideoDataError';
    public readonly code = '1120003';

    constructor(message?: string) {
        super({
            message: message ?? 'Invalid video data',
        });
    }
}
