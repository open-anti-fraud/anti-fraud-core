import { WebComponentError } from '../../shared';

export class UndefinedLocalizedMessagesError extends WebComponentError {
    static readonly ERROR_NAME = 'UndefinedLocalizedMessagesError';
    public readonly code = '1150002';

    constructor(message?: string) {
        super({
            message: message ?? 'There are no localized messages for the selected language',
        });
    }
}
