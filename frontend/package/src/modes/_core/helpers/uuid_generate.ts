import { Device, Logger, UUIDGenerator } from '../../../infrastructure';

export function generateSessionId<T extends { sessionId: unknown }>(model: T, uuidGenerator: UUIDGenerator) {
    const sessionId = uuidGenerator.generateUuid4();
    model.sessionId = sessionId.slice(0, 5);
}

export function generateCorrelationId<T extends { correlationId: unknown; sessionId: unknown }>(
    model: T,
    uuid: string | undefined
) {
    if (uuid !== undefined && model.sessionId !== undefined) {
        model.correlationId = `${model.sessionId}_${uuid}`;
    } else {
        model.correlationId = model.sessionId;
    }
}

export function loadOrCreateDeviceUUID<T extends { deviceUUID: unknown }>(
    model: T,
    device: Device,
    uuidGenerator: UUIDGenerator,
    logger?: Logger
) {
    const deviceUUID = getDeviceUUIDFromStorage(device, logger);

    if (!deviceUUID) {
        model.deviceUUID = createDeviceUuid(uuidGenerator, logger);
        saveDeviceUuidInLocalStorage(model.deviceUUID as string, device, logger);
    } else {
        model.deviceUUID = deviceUUID;
    }
}

function getDeviceUUIDFromStorage(device: Device, logger?: Logger) {
    if (!logger || !device) return;

    try {
        return device.getDeviceUuidFromStorage();
    } catch (err) {
        logger?.addWarningLog(`Failed get device UUID from storage: ${(err as Error).message}`);
    }
}

function createDeviceUuid(uuidGenerator: UUIDGenerator, logger?: Logger) {
    logger?.addDebugLog(`Creating device UUID`);
    const uuid = uuidGenerator!.generateUuid4();
    logger?.addDebugLog(`Created device UUID: ${uuid}`);
    return uuid;
}

function saveDeviceUuidInLocalStorage(uuid: string, device: Device, logger?: Logger) {
    try {
        logger?.addDebugLog(`Saving created device UUID in storage`);
        device!.saveDeviceUuidInStorage(uuid);
        logger?.addDebugLog(`Created device UUID has been save in storage`);
    } catch (err) {
        logger?.addWarningLog(`Failed save device UUID in storage: ${(err as Error).message}`);
    }
}
