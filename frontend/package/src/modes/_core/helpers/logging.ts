import { version } from '../../../../package.json';
import { Device, Logger } from '../../../infrastructure';
import { serializeConfiguration } from '../../../shared';

export function consoleLogComponentVersion() {
    console.log(
        `%c@tdvc/face-onboarding: ${version}`,
        'background:grey;color: white; font-size: x-large;padding:10px;border:1px solid black;border-radius:10px;'
    );
}

export function logComponentVersion(logger?: Logger) {
    const versionMessage = `@tdvc/face-onboarding: ${version}`;
    logger?.addInfoLog(versionMessage);
}

export function logDeviceUserAgent(device: Device, logger?: Logger) {
    if (!logger || !device) return;
    const userAgent = device.getDeviceUserAgent();
    logger.addInfoLog(`UserAgent: ${userAgent}`);
}

export function logDeviceUUID(uuid: string, logger?: Logger & { deviceId: unknown }) {
    if (!logger) return;
    logger.deviceId = uuid;
    logger.addDebugLog(`Device UUID: ${uuid}`);
}

export function logComponentMode(mode: string, logger?: Logger) {
    logger?.addDebugLog(`Component run in ${mode} mode`);
}

export function logClientSideConfiguration(configuration: { [key: string]: unknown }, logger?: Logger) {
    if (!logger) return;

    const data = serializeConfiguration({
        ...configuration,
        locales: Object.keys(configuration['locales'] ?? {}),
    });

    logger.addDebugLog(`Component configuration from client:\n${data}`);
}

export function logLocation(logger?: Logger) {
    try {
        logger?.addDebugLog(`Location: ${location}`);
    } catch (err) {
        logger?.addWarningLog(`Failed log location: ${(err as Error).message}`);
    }
}
