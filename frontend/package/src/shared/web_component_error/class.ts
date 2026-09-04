import { Events } from "../const";


export default class WebComponentError extends Error {
    static readonly ERROR_NAME: string = 'WebComponentError';
    public readonly code: string = '120014';

    constructor({ message, code }: { message?: string; code?: string } = {}) {
        super(message);
        if (code) this.code = code;
        if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    }

    public get name(): string {
        return (this.constructor as typeof WebComponentError).ERROR_NAME;
    }

    public dispatch() {
        const errorEvent = new CustomEvent(Events.WEB_COMPONENT_ERROR_EVENT_NAME, { detail: this });
        window.dispatchEvent(errorEvent);
    }

    static typeof(error: unknown, className: string): error is WebComponentError {
        return error instanceof Error && (error as Error).name === className;
    }
}
