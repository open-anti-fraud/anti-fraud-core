export default class TaskQueue {
    private _queue = Promise.resolve();

    add<T>(task: () => Promise<T>): Promise<T> {
        const result = this._queue.then(task);

        // @ts-ignore
        this._queue = result.catch(() => {});

        return result;
    }
}
