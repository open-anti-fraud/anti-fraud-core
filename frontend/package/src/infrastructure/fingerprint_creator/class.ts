import { getAgentInfo } from './get_agent_info';
import { getCameraInfo } from './get_camera_info';
import { getCanvasInfo } from './get_canvas_info';
import { getConnectionInfo } from './get_connection_info';
import { getDeviceHardwareInfo } from './get_device_hardware_info';
import { getAvailableFontsInfo } from './get_fonts_info';
import { getGeolocationInfo } from './get_geolocation_info';
import { getHTML5Info } from './get_html5_Info';
import { getInternationalizationInfo } from './get_internationalization_info';
import getScreenInfo from './get_screen_info/get_screen_info';
import { getSupportedBrowserApiInfo } from './get_supported_browser_api_info';
import { getVideoFormatsInfo } from './get_video_formats_info';
import { getWebGLInfo } from './get_webgl_info';
import { decrypt, getValueFromAwaitedPromise } from './helpers';

export default class FingerprintCreator {
    async create(availableStreams: MediaDeviceInfo[], videoTrack: MediaStreamTrack, timeout: number): Promise<object> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fingerprint: { [key: string]: any } = {};

        const data = await Promise.allSettled([
            getAgentInfo(timeout),
            getInternationalizationInfo(timeout),
            getSupportedBrowserApiInfo(timeout),
            getVideoFormatsInfo(timeout),
            getConnectionInfo(timeout),
            getGeolocationInfo(timeout),
            getDeviceHardwareInfo(timeout),
            getScreenInfo(timeout),
            getCameraInfo(availableStreams, videoTrack, timeout),
            getCanvasInfo(timeout),
            getAvailableFontsInfo(timeout),
            getWebGLInfo(timeout),
            getHTML5Info(timeout),
        ]);

        fingerprint['agent'] = getValueFromAwaitedPromise(data[0]);
        fingerprint['internationalization'] = getValueFromAwaitedPromise(data[1]);
        fingerprint['browserApi'] = getValueFromAwaitedPromise(data[2]);
        fingerprint['videoFormats'] = getValueFromAwaitedPromise(data[3]);
        fingerprint['connection'] = getValueFromAwaitedPromise(data[4]);
        fingerprint['geolocation'] = getValueFromAwaitedPromise(data[5]);
        fingerprint['hardware'] = getValueFromAwaitedPromise(data[6]);
        fingerprint['screen'] = getValueFromAwaitedPromise(data[7]);
        fingerprint['camera'] = getValueFromAwaitedPromise(data[8]);
        fingerprint['canvas'] = getValueFromAwaitedPromise(data[9])
            ? await decrypt(getValueFromAwaitedPromise(data[9]) as string)
            : undefined;
        fingerprint['fonts'] = getValueFromAwaitedPromise(data[10])
            ? await decrypt(JSON.stringify(getValueFromAwaitedPromise(data[10])))
            : undefined;
        fingerprint['webgl'] = getValueFromAwaitedPromise(data[11])
            ? await decrypt(JSON.stringify(getValueFromAwaitedPromise(data[11])))
            : undefined;
        fingerprint['html5'] = getValueFromAwaitedPromise(data[12])
            ? await decrypt(JSON.stringify(getValueFromAwaitedPromise(data[12])))
            : undefined;

        fingerprint['canvasInfo'] = fingerprint['canvas'];
        fingerprint['fontsInfo'] = fingerprint['fonts'];
        fingerprint['webGlInfo'] = fingerprint['webgl'];
        fingerprint['html5Info'] = fingerprint['html5'];
        fingerprint['browserInfo'] = await decrypt(
            JSON.stringify({
                navigatorInfo: fingerprint['agent'],
                additionalApiInfo: {
                    // @ts-expect-error
                    BatteryManager: !!window.navigator?.BatteryManager,
                    // @ts-expect-error
                    NetworkInformation: !!window.navigator?.NetworkInformation,
                },
                availableNavigatorApiInfo: fingerprint['browserApi'],
                internationalizationInfo: fingerprint['internationalization'],
            })
        );

        return fingerprint;
    }
}
