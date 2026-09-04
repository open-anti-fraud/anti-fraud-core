import { LoggingOutput, LogLevel } from '../../shared';
import { ConsoleTransport } from './browser';
import { Logger, LoggingTransport } from './interfaces';
import { ServerDelivery } from './server';

import { ConnectionData, EnvironmentMetadata, Log } from './types';

export default function createLoggingFacade(
    outputs: LoggingOutput[],
    connectionData: ConnectionData,
    environmentMetadata: EnvironmentMetadata,
    level: LogLevel,
    fallbackInterval: number
) {
    return new LoggingServiceFacade(outputs, connectionData, environmentMetadata, level, fallbackInterval);
}

export class LoggingServiceFacade implements Logger {
    public deviceId: string | undefined;
    public integrationId: string | undefined;
    public applicantId: string | undefined;
    public endeavorId: string | undefined;
    public attemptId: string | undefined;
    private _logLevel: LogLevel;

    private _consoleTransport?: LoggingTransport;
    private _serverTransport?: LoggingTransport;

    constructor(
        outputs: LoggingOutput[],
        connectionData: ConnectionData,
        environmentMetadata: EnvironmentMetadata,
        level: LogLevel,
        fallbackInterval: number
    ) {
        this.deviceId = environmentMetadata.deviceId;
        this.integrationId = environmentMetadata.integrationId;
        this.applicantId = environmentMetadata.applicantId;
        this.endeavorId = environmentMetadata.endeavorId;
        this.attemptId = environmentMetadata.attemptId;
        this._logLevel = level;

        if (outputs.includes(LoggingOutput.BROWSER)) this._consoleTransport = new ConsoleTransport();
        this._serverTransport = new ServerDelivery(outputs, connectionData, fallbackInterval);
    }

    addDebugLog(message: string): void {
        this.handleLog(message, LogLevel.DEBUG);
    }

    addWarningLog(message: string): void {
        this.handleLog(message, LogLevel.WARNING);
    }

    addInfoLog(message: string): void {
        this.handleLog(message, LogLevel.INFO);
    }

    addErrorLog(message: string): void {
        this.handleLog(message, LogLevel.ERROR);
    }

    addCriticalErrorLog(message: string): void {
        this.handleLog(message, LogLevel.CRITICAL);
    }

    private handleLog(message: string, level: LogLevel) {
        if (!this._shouldLog(level)) return;

        const log = this._createLog(message, level);
        const environmentMetadata = this._environmentMetadata;
        this._consoleTransport?.send([log], environmentMetadata);
        this._serverTransport?.send([log], environmentMetadata);
    }

    private get _environmentMetadata(): EnvironmentMetadata {
        return {
            integrationId: this.integrationId!,
            applicantId: this.applicantId,
            attemptId: this.attemptId,
            deviceId: this.deviceId,
            endeavorId: this.endeavorId,
        };
    }

    private _shouldLog(level: LogLevel): boolean {
        const priorities = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 1,
            [LogLevel.WARNING]: 2,
            [LogLevel.ERROR]: 3,
            [LogLevel.CRITICAL]: 4,
        };

        return priorities[level] >= priorities[this._logLevel];
    }

    private _createLog(message: string, level: LogLevel) {
        return {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            message,
            level,
        } as Log;
    }

    async flush() {
        await this._consoleTransport?.flush?.();
        await this._serverTransport?.flush?.();
    }

    destroy(): void {
        this._consoleTransport?.destroy?.();
        this._serverTransport?.destroy?.();
    }
}
