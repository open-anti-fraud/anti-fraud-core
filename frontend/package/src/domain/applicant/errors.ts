import { WebComponentError } from '../../shared';

export class ApplicantNotFoundError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantNotFoundError';
    public readonly code = '1150004';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant not found',
        });
    }
}

export class ApplicantUnconfirmedError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantUnconfirmedError';
    public readonly code = '1150006';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant is not confirmed',
        });
    }
}

export class ApplicantAlreadyExistError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantAlreadyExistError';
    public readonly code = '1150007';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant already exists',
        });
    }
}

export class ApplicantNotRegisterError extends WebComponentError {
    static readonly ERROR_NAME = 'ApplicantNotRegisterError';
    public readonly code = '1150008';

    constructor(message?: string) {
        super({
            message: message ?? 'Applicant is not registered',
        });
    }
}
