export interface Stage {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run(...args: any[]): Promise<unknown>;
    destroy(): void | Promise<void>;
}

export interface IConfigurationMerger<T> {
    merge({ clientSettings, serverSettings }: { clientSettings?: object; serverSettings?: object }): T;
}
