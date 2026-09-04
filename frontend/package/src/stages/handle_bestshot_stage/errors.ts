import { WebComponentError } from '../../shared';

export class NoBestshotsError extends WebComponentError {
    static readonly ERROR_NAME = 'NoBestshotsError';
    public readonly code = '1180001';

    constructor() {
        super({ message: 'There are no bestshots to process' });
    }
}
