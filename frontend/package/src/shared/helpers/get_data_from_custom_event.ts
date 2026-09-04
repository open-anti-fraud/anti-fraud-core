export default function getCustomEventData<T>(event: Event, field: string) {
    const isDataObjExist = 'data' in event && typeof event.data === 'object' && event.data !== null;

    return isDataObjExist ? (event.data as { [field]: T })[field] : undefined;
}
