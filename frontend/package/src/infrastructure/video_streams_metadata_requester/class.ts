import { handleMediaDeviceError } from '../../shared';

export default class VideoStreamsMetadataRequester {
    public async getFromBrowser() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter((device) => device.kind === 'videoinput');
        } catch (err) {
            const error = handleMediaDeviceError(err as Error);
            throw error;
        }
    }
}
