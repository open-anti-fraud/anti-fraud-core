import { WebComponentError } from '../../shared';

export class VersionCompatibilityError extends WebComponentError {
    static readonly ERROR_NAME = 'VersionCompatibilityError';
    public readonly code = '1170001';

    constructor(message?: string) {
        super({
            message: message ?? 'Incompatible versions of components and servers',
        });
    }
}
