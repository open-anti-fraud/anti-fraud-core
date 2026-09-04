import { TaskQueue, timer } from '../../../../../shared';
import { FailedConnectionAttemptError, InvalidConnectionParamsError } from './errors';

export default class WebSocketClient {
    private _ws?: WebSocket;

    private readonly _token: string;
    private readonly _url: URL;
    private readonly _maxReconnectAttempts = 3;
    private _sessionId = 0;
    private _currentAttempt = 0;
    private _isDegraded = false;

    private readonly _ackQueue: Array<() => void> = [];
    private readonly _taskQueue = new TaskQueue();
    private _connectingPromise?: Promise<void>;
    private _fallback: (messages: string[]) => void;
    private _messageId = 0;
    private _messages: Map<number, string>;

    constructor(token: string, baseUrl: string, correlationId: string, fallback: (messages: string[]) => void) {
        this._token = token;
        let url: URL;
        try {
            url = new URL(baseUrl);
        } catch (err) {
            url = new URL(window.location.origin);
        }

        const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
        this._url = new URL(`${protocol}://${url.host}/utils/client-logs/ws?correlation_id=${correlationId}`);

        this._fallback = fallback;
        this._messages = new Map();
    }

    public isReady() {
        return !!this._ws && this._ws.readyState === WebSocket.OPEN;
    }

    public send(data: string) {
        const id = this._messageId++;
        this._messages.set(id, data);

        return this._taskQueue.add(async () => {
            if (this._isDegraded) return;
            await this.ensureConnected();
            const ack = this._waitAck();
            this._ws!.send(data);
            await ack;
            this._messages.delete(id);
        });
    }

    public async ensureConnected(): Promise<void> {
        if (this._ws?.readyState === WebSocket.OPEN) return;
        if (this._connectingPromise) return this._connectingPromise;
        this._connectingPromise = this._connectWithRetry();

        try {
            await this._connectingPromise;
        } finally {
            this._connectingPromise = undefined;
        }
    }

    private async _connectWithRetry(): Promise<void> {
        let lastError: unknown;

        while (this._currentAttempt < this._maxReconnectAttempts) {
            try {
                await this._open();
                return;
            } catch (err) {
                lastError = err;
                this._currentAttempt++;
                await timer(300);
            }
        }

        throw lastError;
    }

    private async _open() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this._url);
            this._attachHandlers(ws, resolve, reject);
        });
    }

    private _attachHandlers(ws: WebSocket, resolve: (value: unknown) => void, reject: (value: unknown) => void) {
        const timer = setTimeout(() => {
            ws?.close();
            reject(new FailedConnectionAttemptError());
        }, 1000);

        let currentSession: number;

        ws.onopen = () => {
            clearTimeout(timer);
            this._currentAttempt = 0;

            this._ws = ws;
            currentSession = this._sessionId;

            this._sendToken();
            resolve('');
        };

        ws.onmessage = (event) => {
            if (currentSession !== this._sessionId) return;
            if (event.data !== 'ack') return;
            const resolve = this._ackQueue.shift();
            resolve?.();
        };

        ws.onerror = () => {
            clearTimeout(timer);
            reject(new FailedConnectionAttemptError());
        };

        ws.onclose = (event) => {
            if (event.code === 3003) reject(new InvalidConnectionParamsError());
        };
    }

    public close() {
        this._sessionId++;
        this._ws?.close(1000);
        this._ws = undefined;
    }

    private _sendToken() {
        if (this._ws?.readyState === WebSocket.OPEN) this._ws.send(this._token);
    }

    private _waitAck(timeout: number = 10_000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (!this._isDegraded) {
                    const unsendingMessages = Array.from(this._messages.values());
                    this._fallback(unsendingMessages);
                    this._messages.clear();
                    this._ackQueue.length = 0;
                }

                this._isDegraded = true;
                this.close();

                reject(new Error('Ack timeout'));
            }, timeout);

            this._ackQueue.push(() => {
                clearTimeout(timer);
                resolve();
            });
        });
    }
}
