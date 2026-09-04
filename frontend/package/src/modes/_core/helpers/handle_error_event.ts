import { FlowStageMeta } from '../../../application';
import { CustomEventsListeners } from '../../../infrastructure';
import { Events } from '../../../shared';

let errorEventHandler: ((event: Event) => void) | undefined;

export function startHandleErrorEvent<T extends FlowStageMeta>(
    model: T,
    customEventsListeners: CustomEventsListeners,
    callback: (error: Error) => unknown
) {
    if (errorEventHandler === undefined) errorEventHandler = (event: Event) => handleErrorEvent(event, model, callback);
    customEventsListeners?.addListener(Events.WEB_COMPONENT_ERROR_EVENT_NAME, errorEventHandler);
}

function handleErrorEvent<T extends FlowStageMeta>(event: Event, model: T, callback: (error: Error) => unknown) {
    if (!!model.error) return Promise.resolve();
    model.error = (event as CustomEvent).detail;
    return callback(model.error as Error);
}

export function stopHandleErrorEvent(customEventsListeners: CustomEventsListeners) {
    if (errorEventHandler) {
        customEventsListeners?.removeListener(Events.VIDEO_FRAME_RECEIVED, errorEventHandler);
        errorEventHandler = undefined;
    }
}
