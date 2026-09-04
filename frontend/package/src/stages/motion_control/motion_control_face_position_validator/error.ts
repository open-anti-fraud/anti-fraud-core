import { WebComponentError } from '../../../shared';

export class FacePositionValidatorByCommandNotFoundError extends WebComponentError {
    static readonly ERROR_NAME = 'FacePositionValidatorByCommandNotFoundError';

    constructor(message?: string) {
        super({
            message: message ?? "Validator don't found because invalid pattern",
        });
    }
}

export class FailedMotionControlActionError extends WebComponentError {
    static readonly ERROR_NAME = 'FailedMotionControlActionError';

    constructor(message?: string) {
        super({
            message: message ?? 'Failed to execute motion control action',
        });
    }
}
