export async function getInfoOrEmptyDataAfterTimeout<T>(
    waitTime: number,
    fn: (() => T | Promise<T | Error>) | Promise<T | Error>,
    abortData: T
) {
    const abortPromise = createAbortPromiseByTimeout<T>(waitTime, abortData);

    let action: Promise<T | Error>;
    if (!(fn instanceof Promise)) {
        action = wrapFunctionToPromise<T>(fn as () => T);
    } else {
        action = fn;
    }

    return Promise.race<T | Error>([action, abortPromise])
        .then((data) => {
            if (!(data instanceof Error)) return data;
            return abortData;
        })
        .catch((err) => {
            const error: Error = err as Error;
            console.error('Fingerprint error message: ', error.message);
            console.error('Fingerprint error stack: ', error.stack);
            return abortData;
        });
}

function createAbortPromiseByTimeout<T>(waitTime: number, abortData: T) {
    return new Promise<T>((resolve) => {
        setTimeout(() => {
            resolve(abortData);
        }, waitTime);
    });
}

function wrapFunctionToPromise<T>(fn: () => T) {
    return new Promise<T>((resolve, reject) => {
        try {
            const data = fn();
            resolve(data);
        } catch (err) {
            reject(err);
        }
    });
}


export function getErrorPromise<T>() {
    return new Promise<T | Error>((reject) => {
        setTimeout(() => reject(new Error('Error')), 1000);
    });
}

export function getValueFromAwaitedPromise(data: PromiseSettledResult<unknown>) {
    return data.status === 'fulfilled' ? data.value : undefined;
}

export function getPositionPermission() {
    return new Promise((resolve) => {
        const isGeolocationApiSupported = 'geolocation' in navigator;

        if (!isGeolocationApiSupported) {
            return Promise.reject('No supported');
        }

        const isPermissionApiSupported = 'permissions' in navigator && 'query' in navigator.permissions;

        const getGeolocationPermission = () =>
            navigator.geolocation.getCurrentPosition(
                () => {
                    resolve({ geolocation: 'granted' });
                },
                () => {
                    resolve({ geolocation: 'denied' });
                }
            );

        if (isPermissionApiSupported) {
            navigator.permissions.query({ name: 'geolocation' }).then((data) => {
                if (data.state === 'granted') {
                    resolve({ geolocation: 'granted' });
                } else {
                    return getGeolocationPermission();
                }
            });
        } else {
            return getGeolocationPermission();
        }
    });
}

export async function decrypt(text = '') {
    if (window.crypto) {
        const textUint8 = new TextEncoder().encode(text);

        // @ts-ignore
        const subtle = crypto.subtle || crypto.webkitSubtle;
        const hashBuffer = await subtle.digest('SHA-256', textUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }

    return text;
}
