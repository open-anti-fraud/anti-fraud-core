export function intervalCheck(fn: () => boolean, time = 33): Promise<void> {
    if (fn()) return Promise.resolve();

    return new Promise((resolve, rejects) => {
        const interval = setInterval(() => {
            try {
                if (fn()) {
                    clearInterval(interval);
                    resolve();
                }
            } catch (err) {
                clearInterval(interval);
                rejects(err);
            }
        }, time);
    });
}

export function intervalCheckWithTimeout(
    fn: () => boolean,
    handleTimeout: () => void,
    timeout: number,
    time = 33
): Promise<void> {
    if (fn()) return Promise.resolve();

    const startDate = Date.now();
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            try {
                if (fn()) {
                    clearInterval(interval);
                    resolve();
                    return;
                }

                if (Date.now() - startDate > timeout) {
                    clearInterval(interval);
                    handleTimeout();
                    reject(new Error('Timeout'));
                }
            } catch (err) {
                clearInterval(interval);
                reject(err);
            }
        }, time);
    });
}
