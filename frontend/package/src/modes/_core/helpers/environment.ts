import { version } from '../../../../package.json';
import { BrowserApiSupportChecker, Device, Logger, VersionCompatibilityValidator } from '../../../infrastructure';

export function checkSupportRequiredApi(browserSupportApiChecker: BrowserApiSupportChecker, logger?: Logger) {
    logger?.addDebugLog('Verification that the browser supports the required API is running');
    browserSupportApiChecker!.checkThatSupportMediaDeviceApi();
    browserSupportApiChecker!.checkThatSupportWorkerApi();
    logger?.addDebugLog('Verification that the browser supports the required API has been finished');
}

export function checkSupportHardwareAcceleration(
    device: Device,
    browserSupportApiChecker: BrowserApiSupportChecker,
    logger?: Logger
) {
    logger?.addDebugLog('Verification that the browser supports hardware acceleration is running');
    const gl = browserSupportApiChecker!.checkThatSupportWebglApi();
    if (device?.isAppleDevice()) browserSupportApiChecker?.checkThatSupportHardwareAcceleration(gl);
    logger?.addDebugLog('Verification that the browser supports hardware acceleration has been finished');
}

export async function checkVersionCompatibility<
    T extends { correlationId: unknown; clientSideConfiguration: { [key: string]: unknown } },
>(model: T, versionCompatibilityValidator: VersionCompatibilityValidator, logger?: Logger) {
    logger?.addDebugLog('Validation of version compatibility starting');

    try {
        const { integrationId, baseUrl, authenticationToken } = model.clientSideConfiguration;
        const { correlationId } = model;
        await versionCompatibilityValidator!.validate(
            integrationId as string,
            baseUrl as string,
            version,
            correlationId as string,
            authenticationToken as string
        );
    } catch (err) {
        logger?.addWarningLog(`${(err as Error).name}: ${(err as Error).message}`);
    } finally {
        logger?.addDebugLog('Validation of version compatibility has been finished');
    }
}
