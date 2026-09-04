import { LogAck, LoggingTransport } from '../../../interfaces';
import { EnvironmentMetadata, Log } from '../../../types';
import { WebSocketClient } from '../client';

export default class WebsocketTransport implements LoggingTransport {
    private _transport: WebSocketClient;

    constructor(transport: WebSocketClient) {
        this._transport = transport;
    }

    public isReady() {
        return this._transport.isReady();
    }

    public async send(logs: Log[], environmentMetadata?: EnvironmentMetadata): Promise<LogAck> {
        const successIds = [];
        const failedIds = [];

        for (const log of logs) {
            try {
                const message = this._formateLog(log, environmentMetadata);
                await this._transport!.send(message);
                successIds.push(log.id);
            } catch (err) {
                failedIds.push(log.id);
            }
        }

        return {
            successIds,
            failedIds,
        };
    }

    private _formateLog(log: Log, environmentMetadata?: EnvironmentMetadata) {
        return [
            environmentMetadata?.deviceId ?? 'undefined',
            environmentMetadata?.applicantId ?? 'undefined',
            environmentMetadata?.endeavorId ?? 'undefined',
            environmentMetadata?.attemptId ?? 'undefined',
            log.date,
            log.level,
            log.message,
        ].join(';');
    }

    flush(): void {}
    destroy(): void {
        this._transport.close();
    }
}
