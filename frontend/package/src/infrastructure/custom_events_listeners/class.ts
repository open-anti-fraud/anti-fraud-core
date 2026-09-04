import { Events, WebComponentError } from '../../shared';

export type Listener<T = Event> = (event: T) => void;

export default class CustomEventsListeners {
    private _register: Map<string, Set<Listener>>;

    constructor() {
        this._register = new Map();
    }

    addListener(eventName: string, fn: Listener, target: HTMLElement | Window = window) {
        this.throwErrorIfInvalidName(eventName);

        if (this._isListenerRegistered(eventName, fn)) return;

        let eventListeners = this._register.get(eventName);
        if (!eventListeners) eventListeners = new Set();
        eventListeners.add(fn);

        this._register.set(eventName, eventListeners);

        target.addEventListener(eventName, fn);
    }

    removeListener(eventName: string, fn: Listener, target: HTMLElement | Window = window) {
        this.throwErrorIfInvalidName(eventName);

        if (!this._isListenerRegistered(eventName, fn)) return;

        const eventListeners = this._register.get(eventName);
        if (eventListeners && eventListeners.has(fn)) eventListeners.delete(fn);

        if (!eventListeners || eventListeners.size === 0) {
            this._register.delete(eventName);
        }

        target.removeEventListener(eventName, fn);
    }

    public throwErrorIfInvalidName(eventName: string) {
        if (!this._isValidEventName(eventName)) throw new WebComponentError({ message: 'Invalid name of the event' });
    }

    public _isValidEventName(name: string) {
        return Object.values(Events).some((value) => value === name);
    }

    public _isListenerRegistered(eventName: string, fn: Listener) {
        return this._register.get(eventName)?.has(fn) ?? false;
    }

    removeAllListeners() {
        for (const [event, listeners] of this._register.entries()) {
            for (const fn of listeners) {
                this.removeListener(event, fn);
            }
        }
    }

    destroy() {
        this.removeAllListeners();
    }
}
