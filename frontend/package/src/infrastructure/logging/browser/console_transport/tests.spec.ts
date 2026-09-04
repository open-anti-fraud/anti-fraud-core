import { afterEach, beforeEach, describe, expect, MockInstance, test, vi } from '../../../../../utils';
import { LogLevel } from '../../../../shared';
import ConsoleTransport from './class';

let loggingService: ConsoleTransport;
let consoleLogSpy: MockInstance<{
    (...data: unknown[]): void;
    (message?: unknown, ...optionalParams: unknown[]): void;
}>;
const TEST_MESSAGE = 'Test message';
const LOG_TIMESTAMP_REGEX = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]$/; // for match to [2025-10-08T09:12:40.760Z]

function getFirstConsoleLog(): string {
    return consoleLogSpy.mock.calls[0][0] as string;
}

describe('Console logging service', () => {
    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        loggingService = new ConsoleTransport();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        loggingService.destroy();
    });

    test.for([
        ['debug', 'addDebugLog'],
        ['info', 'addInfoLog'],
        ['warning', 'addWarningLog'],
        ['error', 'addErrorLog'],
        ['critical', 'addCriticalErrorLog'],
    ])('log %s message', ([level]) => {
        loggingService.send([
            { id: '1', date: new Date().toISOString(), level: level as LogLevel, message: TEST_MESSAGE },
        ]);

        const consoleLogMessage = getFirstConsoleLog();
        const logTimestamp = consoleLogMessage.substring(2, 28);

        expect(logTimestamp).toMatch(LOG_TIMESTAMP_REGEX);
        expect(consoleLogMessage).toContain(`[${level}]`);
        expect(consoleLogMessage).toContain(TEST_MESSAGE);
    });
});
