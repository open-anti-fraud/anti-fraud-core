declare module '*.css';

declare module '*?worker&inline' {
    const workerConstructor: {
        new (options?: { name?: string }): Worker;
    };
    export default workerConstructor;
}

declare module '*?worker' {
    const workerConstructor: {
        new (options?: { name?: string }): Worker;
    };
    export default workerConstructor;
}