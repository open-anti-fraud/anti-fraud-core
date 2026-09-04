import { WebComponentError } from '../../shared';

export class NotSupportedMediaDevicesError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedMediaDevicesError';
    public readonly code = '1400002';

    constructor(message?: string) {
        super({
            message: message ?? 'The browser does not support the Media Devices API',
        });
    }
}

export class BrowserNotSupportedWorkerApi extends WebComponentError {
    static readonly ERROR_NAME = 'BrowserNotSupportedWorkerApi';
    public readonly code = '1400020';

    constructor(message?: string) {
        super({
            message: message ?? "This browser doesn't support Worker API",
        });
    }
}

export class NotSupportedVideoEncoderApiError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedVideoEncoderApiError';
    public readonly code = '1160003';

    constructor(message?: string) {
        super({
            message: message ?? "The browser doesn't support Video Encoder API",
        });
    }
}

export class NotSupportedWebglApiError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedWebglApiError';
    public readonly code = '1170006';

    constructor(message?: string) {
        super({
            message: message ?? "The browser doesn't support WebGL API",
        });
    }
}

export class HardwareAccelerationUnavailableError extends WebComponentError {
    static readonly ERROR_NAME = 'HardwareAccelerationUnavailableError';
    public readonly code = '1170010';

    constructor(message?: string) {
        super({
            message: message ?? 'Hardware acceleration unavailable error',
        });
    }
}
