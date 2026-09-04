import axios from 'axios';
import { LogAck, LoggingTransport } from '../../../interfaces';
import { EnvironmentMetadata, Log } from '../../../types';
import { HttpClient } from '../client';
import { FailedSendingLogAttemptError } from '../errors';

export default class HttpTransport implements LoggingTransport {
    private _logs: Log[] = [];
    private _client: HttpClient;
    private _environmentMetadata: Partial<EnvironmentMetadata>;
    private _timer: NodeJS.Timeout | undefined;
    private _isFlushing = false;
    private _isEndpointAvailable = true;

    constructor(client: HttpClient, interval: number) {
        this._client = client;
        if (interval > 0) this._timer = setInterval(this.flush.bind(this), interval);
    }

    async send(logs: Log[], environmentMetadata: EnvironmentMetadata): Promise<LogAck> {
        this._environmentMetadata = environmentMetadata;
        this._logs.push(...logs);

        return Promise.resolve({
            successIds: logs.map((item) => item.id),
            failedIds: [],
        });
    }

    async flush() {
        if (!this._isEndpointAvailable || this._isFlushing || this._logs.length === 0) return;
        this._isFlushing = true;

        const batch = this._logs;
        this._logs = [];

        const data = {
            integrationId: this._environmentMetadata.integrationId!,
            applicantId: this._environmentMetadata.applicantId,
            attemptId: this._environmentMetadata.attemptId,
            deviceId: this._environmentMetadata.deviceId,
            endeavorId: this._environmentMetadata.endeavorId,
            logs: batch.map((item) => ({ date: item.date, message: item.message, level: item.level })),
        };

        try {
            await this._client.post(data);
        } catch (err) {
            const isCorsError = axios.isAxiosError(err) && !err.response;
            const isServerError = axios.isAxiosError(err) && err.response && err.response.status >= 500;

            if (isCorsError || !isServerError) {
                this._isEndpointAvailable = false;
                console.error(new FailedSendingLogAttemptError());
            }

            this._logs = [...batch, ...this._logs];
        } finally {
            this._isFlushing = false;
        }
    }

    destroy() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}
