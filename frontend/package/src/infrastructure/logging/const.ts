import { LoggingOutput, LoggingSettings, LogLevel } from '../../shared';

export const LOGGING_SERVICE_SYMBOL = Symbol('logging_service');

export const DEFAULT_LOGGING_SETTINGS: LoggingSettings = {
    enabled: true,
    level: LogLevel.DEBUG,
    output: [LoggingOutput.SERVER_VIA_WEBSOCKET],
    correlationId: undefined,
    fallbackInterval: 3_000,
};
