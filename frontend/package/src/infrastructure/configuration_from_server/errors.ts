import { WebComponentError } from '../../shared';

export class NoRequiredConfigurationFieldsError extends WebComponentError {
    static readonly ERROR_NAME = 'NoRequiredConfigurationFieldsError';
    public readonly code = '1400011';

    constructor(message?: string) {
        super({
            message: message ?? 'The settings received from the server do not contain the required data',
        });
    }
}

export class NoExistIntegrationError extends WebComponentError {
    static readonly ERROR_NAME = 'NoExistIntegrationError';
    public readonly code = '180002';

    constructor(message?: string) {
        super({
            message:
                message ?? 'Integration does not exist on the server. Check the integration ID and the server address',
        });
    }
}

export class FailedFetchOfConfigurationError extends WebComponentError {
    static readonly ERROR_NAME = 'FailedFetchOfConfigurationError';
    public readonly code = '180002';

    constructor(message?: string) {
        super({
            message: message ?? 'When requesting component configuration from the server, an error occurred',
        });
    }
}
