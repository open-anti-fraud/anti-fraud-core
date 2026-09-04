import { LoggingOutput } from '../../../shared';
import { LogAck, LoggingTransport } from '../interfaces';
import { ConnectionData, EnvironmentMetadata, Log } from '../types';
import { HttpTransport } from './http';
import { HttpClient } from './http/client';
import { WebSocketClient, WebsocketTransport } from './websocket';

export default class ServerDelivery implements LoggingTransport {
    private _serverRealtimeTransport?: LoggingTransport;
    private _serverBatchesTransport?: LoggingTransport;

    constructor(outputs: LoggingOutput[], connectionData: ConnectionData, fallbackInterval: number) {
        if (outputs.includes(LoggingOutput.SERVER_VIA_WEBSOCKET)) {
            const httpClient = new HttpClient(connectionData);
            this._serverBatchesTransport = new HttpTransport(httpClient, fallbackInterval);

            const { integrationId, baseUrl, correlationId, authenticationToken } = connectionData;
            const websocketClient = new WebSocketClient(
                integrationId ?? authenticationToken ?? '',
                baseUrl,
                correlationId,
                (messages: string[]) => {
                    if (messages.length === 0) return;

                    const logs = messages.map((item) => {
                        const [, , , , date, level, message] = item.split(';');
                        return {
                            date,
                            level,
                            message,
                        } as Log;
                    });

                    const [deviceId, applicantId, endeavorId, attemptId] = messages[messages.length - 1].split(';');
                    const environmentMetadata = {
                        deviceId: deviceId === 'undefined' ? undefined : deviceId,
                        applicantId: applicantId === 'undefined' ? undefined : applicantId,
                        endeavorId: endeavorId === 'undefined' ? undefined : endeavorId,
                        attemptId: attemptId === 'undefined' ? undefined : attemptId,
                        integrationId: integrationId === 'undefined' ? undefined : integrationId,
                    };

                    this._serverBatchesTransport?.send(logs, environmentMetadata);
                }
            );
            websocketClient.ensureConnected();
            this._serverRealtimeTransport = new WebsocketTransport(websocketClient);
        }
    }

    async send(log: Log[], environmentMetadata?: EnvironmentMetadata): Promise<LogAck> {
        if (this._serverRealtimeTransport?.isReady?.()) {
            await this._serverBatchesTransport?.flush?.();
            this._serverRealtimeTransport?.send(log, environmentMetadata);
        } else {
            this._serverBatchesTransport?.send(log, environmentMetadata);
        }

        return {
            successIds: [],
            failedIds: [],
        };
    }

    async flush() {
        await this._serverRealtimeTransport?.flush?.();
        await this._serverBatchesTransport?.flush?.();
    }

    destroy(): void {
        this._serverRealtimeTransport?.destroy?.();
        this._serverBatchesTransport?.destroy?.();
    }
}
