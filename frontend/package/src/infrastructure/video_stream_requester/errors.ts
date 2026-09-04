import { WebComponentError } from '../../shared';

export class TimeoutAccessToCameraError extends WebComponentError {
    static readonly ERROR_NAME = 'TimeoutAccessToCameraError';
    public readonly code = '1160004';

    constructor(message?: string) {
        super({
            message: message ?? 'Not allowed access to camera by timeout',
        });
    }
}
