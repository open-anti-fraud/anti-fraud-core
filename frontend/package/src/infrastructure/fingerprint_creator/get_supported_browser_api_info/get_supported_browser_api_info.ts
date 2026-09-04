import {
    getInfoOrEmptyDataAfterTimeout,
    getValueFromAwaitedPromise,
} from '../helpers';
import { DEFAULT_NAVIGATOR_API } from './get_supported_browser_api_info.const';

export default async function getSupportedBrowserApiInfo(timeout = 2000) {
    const data = await Promise.allSettled([
        getNavigatorApiInfo(timeout),
        getWebCodecApiInfo(timeout),
        getMediaRecorderApiInfo(timeout),
        getWebRtcApiInfo(timeout),
    ]);

    return {
        ...(getValueFromAwaitedPromise(data[0]) ?? DEFAULT_NAVIGATOR_API),
        webCodec: getValueFromAwaitedPromise(data[1]),
        mediaRecorder: getValueFromAwaitedPromise(data[2]),
        webRTC: getValueFromAwaitedPromise(data[3]),
    };
}

async function getNavigatorApiInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<object>(
        timeout,
        () => {
            const res = {};

            Object.keys(DEFAULT_NAVIGATOR_API).forEach(
                (item) =>
                    // @ts-expect-error
                    (res[item] = !!window.navigator[item])
            );

            return res;
        },
        DEFAULT_NAVIGATOR_API
    );
}

async function getWebCodecApiInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<boolean | undefined>(
        timeout,
        () => 'VideoEncoder' in window && 'VideoDecoder' in window,
        undefined
    );
}

async function getMediaRecorderApiInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<boolean | undefined>(
        timeout,
        () => 'MediaRecorder' in window,
        undefined
    );
}

async function getWebRtcApiInfo(timeout: number) {
    return getInfoOrEmptyDataAfterTimeout<boolean | undefined>(
        timeout,
        () => 'RTCPeerConnection' in window,
        undefined
    );
}
