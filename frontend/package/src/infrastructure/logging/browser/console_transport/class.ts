import { LogLevel } from '../../../../shared';
import { LoggingTransport } from '../../interfaces';
import { Log } from '../../types';

const Colors = {
    [LogLevel.CRITICAL]: 'red',
    [LogLevel.ERROR]: 'red',
    [LogLevel.INFO]: 'black',
    [LogLevel.WARNING]: 'darkorange',
    [LogLevel.DEBUG]: 'black',
};

export default class ConsoleTransport implements LoggingTransport {
    public send(logs: Log[]) {
        const successIds: string[] = [];

        logs.forEach((log) => {
            const formatedLog = this._formatLogToString(log);
            console.log(`%c${formatedLog}`, `font-size: 14px; color: ${Colors[log.level]};`);
            successIds.push(log.id);
        });

        return Promise.resolve({
            successIds,
            failedIds: [],
        });
    }

    private _formatLogToString({ date, level, message }: Log) {
        return `[${date}] [${level}] ${message}`;
    }

    flush(): void {}
    destroy(): void {}
}
