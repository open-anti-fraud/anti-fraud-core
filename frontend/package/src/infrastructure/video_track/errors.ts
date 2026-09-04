import { WebComponentError } from '../../shared';

export class NoVideoTrackError extends WebComponentError {
    static readonly ERROR_NAME = 'NoVideoTrackError';
    public readonly code = '1400008';

    constructor(message?: string) {
        super({ message });
    }
}

export class NoCameraCapabilitiesInfoError extends WebComponentError {
    static readonly ERROR_NAME = 'NoCameraCapabilitiesInfoError';
    public readonly code = '1400009';

    constructor(message?: string) {
        super({ message });
    }
}


export class InactiveVideoTrackError extends WebComponentError {
    static readonly ERROR_NAME = 'InactiveVideoTrackError';
    public readonly code = '1170003';

    constructor(message?: string) {
        super({
            message: message ?? 'Inactive video track',
        });
    }
}

export class EndedVideoTrackError extends WebComponentError {
    static readonly ERROR_NAME = 'EndedVideoTrackError';
    public readonly code = '1170004';

    constructor(message?: string) {
        super({
            message: message ?? 'Inactive video track',
        });
    }
}

export class DisabledVideoTrackError extends WebComponentError {
    static readonly ERROR_NAME = 'DisabledVideoTrackError';
    public readonly code = '1170005';

    constructor(message?: string) {
        super({
            message: message ?? 'Disabled video track',
        });
    }
}