import { WebComponentError } from '../../shared';

export class InitializationProcessingVideoStremWorkerError extends WebComponentError {
    static readonly ERROR_NAME = 'InitializationProcessingVideoStremWorkerError';
    public readonly code = '1400018';

    constructor(message?: string) {
        super({
            message: message ?? 'An error occurred while initializing the worker',
        });
    }
}

export class WaitResponseWorkerTimeoutError extends WebComponentError {
    static readonly ERROR_NAME = 'WaitResponseWorkerTimeoutError';
    public readonly code = '1400019';

    constructor(message?: string) {
        super({
            message: message ?? 'The waiting time for a response from the worker has expired',
        });
    }
}
