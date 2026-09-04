import { Logger } from '../../../infrastructure';

export function callOnMountedCallback<T extends { isInitialized: boolean }>(model: T, fn: unknown, logger?: Logger) {
    if (!model.isInitialized) {
        model.isInitialized = true;
        callCallback(fn, [], logger);
    }
}

export function callCallback(fn: unknown, args: unknown[] = [], logger?: Logger) {
    if (fn && typeof fn === 'function') {
        logger?.addDebugLog(`${fn.name} callback calling`);
        fn(...args);
    }
}
