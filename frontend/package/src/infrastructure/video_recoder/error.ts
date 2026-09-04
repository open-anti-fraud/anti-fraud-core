import { WebComponentError } from '../../shared';

export class NotSupportedVideoFormatError extends WebComponentError {
    static readonly ERROR_NAME = 'NotSupportedVideoFormatError';

    constructor(message?: string) {
        super({
            message: message ?? 'The video format is not supported',
        });
    }
}
