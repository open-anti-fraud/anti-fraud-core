import { WebComponentError } from '../../shared';

export class UndefinedVideoStreamResolutionError extends WebComponentError {
    static readonly ERROR_NAME = 'UndefinedVideoStreamResolutionError';

    constructor(message?: string) {
        super({
            message: message ?? 'Part of the video stream resolution data is missing',
        });
    }
}

export class UndefinedVideoStreamFpsError extends WebComponentError {
    static readonly ERROR_NAME = 'UndefinedVideoStreamFpsError';

    constructor(message?: string) {
        super({
            message: message ?? 'The video stream fps data is missing',
        });
    }
}

export class LivenessTransportConnectionTimeoutError extends WebComponentError {
    static readonly ERROR_NAME = 'LivenessTransportConnectionTimeoutError';
    public readonly code = '190002';

    constructor(message?: string) {
        super({
            message: message ?? 'Liveness transport connection timed out',
        });
    }
}
