import { EnvironmentMetadata, Log } from './types';

export interface LogAck {
    successIds: string[];
    failedIds: string[];
}

export interface LoggingTransport {
    send(logs: Log[], environmentMetadata?: EnvironmentMetadata): Promise<LogAck>;
    flush?(): void;
    destroy?(): void;
    isReady?(): boolean;
}

export interface Logger {
    addDebugLog(message: string): void;
    addWarningLog(message: string): void;
    addInfoLog(message: string): void;
    addErrorLog(message: string): void;
    addCriticalErrorLog(message: string): void;
}
