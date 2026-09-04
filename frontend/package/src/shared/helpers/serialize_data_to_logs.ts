export function serializeConfiguration(object: object) {
    try {
        return JSON.stringify(object, (key, value) => {
            if (['videoRecorderToken', 'videoRecorderDecryptionKey'].includes(key)) return;
            return typeof value === 'function' ? 'function' : value;
        });
    } catch (err) {
        return 'Unhandled object';
    }
}

export function serializeObject(object: object | undefined) {
    if (!object) return 'Undefined data';

    try {
        return JSON.stringify(object, (_, value) => {
            return typeof value === 'function' ? 'function' : value;
        });
    } catch (err) {
        return 'Unhandled object';
    }
}
