import { WebComponentError } from '../../shared';

const CONFIGURATION_ERROR_CODE = '190001';

export class NoComponentIdError extends WebComponentError {
    static readonly ERROR_NAME = 'NoComponentIdError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Integration ID is missing in configuration',
        });
    }
}

export class NotValidComponentIdError extends WebComponentError {
    static readonly ERROR_NAME = 'NotValidComponentIdError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'The integration ID must be in the UUID4 format',
        });
    }
}

export class NoBaseUrlError extends WebComponentError {
    static readonly ERROR_NAME = 'NoBaseUrlError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Base URL is missing in configuration',
        });
    }
}

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

export class ComponentDisabledError extends WebComponentError {
    static readonly ERROR_NAME = 'ComponentDisabledError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'The component is disabled',
        });
    }
}

export class NoEnabledApplicantFieldsError extends WebComponentError {
    static readonly ERROR_NAME = 'NoEnabledApplicantFieldsError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'No enabled application fields found in configuration',
        });
    }
}

export class NoPrimaryApplicantFieldsError extends WebComponentError {
    static readonly ERROR_NAME = 'NoPrimaryApplicantFieldsError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'No primary application fields found in configuration',
        });
    }
}

export class NoPrimaryEnabledApplicantFieldsError extends WebComponentError {
    static readonly ERROR_NAME = 'NoPrimaryEnabledApplicantFieldsError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'No primary enabled application fields found in configuration',
        });
    }
}

export class SeveralPrimaryEnabledApplicantFieldsError extends WebComponentError {
    static readonly ERROR_NAME = 'SeveralPrimaryEnabledApplicantFieldsError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Multiple primary enabled application fields detected in configuration',
        });
    }
}

export class CameraIdWithCameraSelectorError extends WebComponentError {
    static readonly ERROR_NAME = 'CameraIdWithCameraSelectorError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Camera ID and camera selector cannot be used simultaneously in configuration',
        });
    }
}

export class InvalidMotionControlAttemptCountError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidMotionControlAttemptCountError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Motion control attempt count must be a positive integer',
        });
    }
}

export class EnabledMotionControlWithoutFaceModelError extends WebComponentError {
    static readonly ERROR_NAME = 'EnabledMotionControlWithoutFaceModelError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Motion control cannot be enabled without a face model',
        });
    }
}

export class TimeToStartRecordLessThenOneSecondError extends WebComponentError {
    static readonly ERROR_NAME = 'TimeToStartRecordLessThenOneSecondError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Recording start time must be at least 1 second',
        });
    }
}

export class InvalidAuthenticationTokenError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidAuthenticationTokenError';
    public readonly code = CONFIGURATION_ERROR_CODE;

    constructor(message?: string) {
        super({
            message: message ?? 'Invalid authentication token',
        });
    }
}
