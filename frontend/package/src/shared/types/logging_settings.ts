export type LoggingSettingsBlock = {
    loggingSettings: LoggingSettings;
};

export type LoggingSettings = {
    enabled: boolean;
    level: LogLevel;
    output: LoggingOutput[];
    correlationId: string | undefined;
    fallbackInterval?: number;
};

export enum LoggingOutput {
    BROWSER = 'browser',
    SERVER_VIA_WEBSOCKET = 'server_via_websocket',
}

export enum LogLevel {
    DEBUG = 'debug',
    WARNING = 'warning',
    INFO = 'info',
    ERROR = 'error',
    CRITICAL = 'critical',
}
