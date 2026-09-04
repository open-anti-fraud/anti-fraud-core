import { WebComponentError } from '../../../shared';

export class WebSocketTimeoutConnectionError extends WebComponentError {
    static readonly ERROR_NAME = 'WebSocketTimeoutConnectionError';
    public readonly code = '190002';

    constructor(message?: string) {
        super({
            message: message ?? 'WebSocket connection timed out',
        });
    }
}

export class ConnectionEstablishmentError extends WebComponentError {
    static readonly ERROR_NAME = 'ConnectionEstablishmentError';
    public readonly code = '1300002';

    constructor(message?: string) {
        super({
            message: message ?? 'Failed to establish connection',
        });
    }
}
