import { LogLevel } from '../../shared';

export type ConnectionData = {
    integrationId?: string;
    baseUrl: string;
    correlationId: string;
    authenticationToken: string | undefined;
};

export type EnvironmentMetadata = {
    deviceId?: string;
    integrationId?: string;
    applicantId?: string;
    endeavorId?: string;
    attemptId?: string;
};

export type Log = {
    id: string;
    date: string;
    message: string;
    level: LogLevel;
};

export enum LoggingServiceTypes {
    SERVER_WEBSCOKET,
    SERVER_HTTP,
    BROWSER_CONSOLE,
}
