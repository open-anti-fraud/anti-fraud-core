import { WebComponentError } from '../../shared';

export class InvalidEndeavorInfoError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidEndeavorInfoError';
    public readonly code: string;

    constructor(message?: string, code?: string) {
        super({
            message: message ?? 'Invalid endeavor info',
        });
        this.code = code ?? '120013';
    }
}

export class AntispoofingValidationError extends WebComponentError {
    static readonly ERROR_NAME = 'AntispoofingValidationError';
    public readonly code = '120012';

    constructor(message?: string) {
        super({
            message: message ?? 'Antispoofing validation failed',
        });
    }
}

export class DeepfakeValidationError extends WebComponentError {
    static readonly ERROR_NAME = 'DeepfakeValidationError';
    public readonly code = '1400021';

    constructor(message?: string) {
        super({
            message: message ?? 'Deepfake detection validation failed',
        });
    }
}

export class RegistrationMatchingFailedError extends WebComponentError {
    static readonly ERROR_NAME = 'RegistrationMatchingFailedError';
    public readonly code = '120011';

    constructor(message?: string) {
        super({
            message: message ?? 'Registration matching failed',
        });
    }
}

export class AuthorizationMatchingFailedError extends WebComponentError {
    static readonly ERROR_NAME = 'AuthorizationMatchingFailedError';
    public readonly code = '120011';

    constructor(message?: string) {
        super({
            message: message ?? 'Authorization matching failed',
        });
    }
}

export class LowImageQualityError extends WebComponentError {
    static readonly ERROR_NAME = 'LowImageQualityError';
    public readonly code = '120010';

    constructor(message?: string) {
        super({
            message: message ?? 'Image quality is too low for processing',
        });
    }
}

export class ApplicantInBlackListError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantInBlackListError';
    public readonly code = '140003';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant is in the black list',
        });
    }
}

export class ApplicantRiskError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantRiskError';
    public readonly code = '160002';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant identified as high risk',
        });
    }
}

export class ValidationTimeHasExpiredError extends WebComponentError {
    static readonly ERROR_NAME = 'ValidationTimeHasExpiredError';
    public readonly code = '1150003';

    constructor(message?: string) {
        super({
            message: message ?? 'Validation time has expired',
        });
    }
}
