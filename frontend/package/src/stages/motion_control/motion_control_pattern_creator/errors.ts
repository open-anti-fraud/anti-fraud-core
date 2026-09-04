import { WebComponentError } from '../../../shared';

export class InvalidMotionControlPatternError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidMotionControlPatternError';
    public readonly code = '1400016';

    constructor(message?: string) {
        super({
            message: message ?? 'Invalid motion control pattern',
        });
    }
}
