import { getInfoOrEmptyDataAfterTimeout, getValueFromAwaitedPromise } from '../helpers';

export default async function getDeviceHardwareInfo(timeout: number) {
    const data = await Promise.allSettled([
        getDeviceMemoryInfo(timeout),
        getDeviceCpuInfo(timeout),
        getGpuInfo(timeout),
        getDeviceBatteryInfo(timeout),
    ]);

    return {
        deviceMemory: getValueFromAwaitedPromise(data[0]),
        cpu: getValueFromAwaitedPromise(data[1]),
        gpu: getValueFromAwaitedPromise(data[2]),
        battery: getValueFromAwaitedPromise(data[3]),
    };
}

async function getDeviceMemoryInfo(timeout = 2000) {


    return getInfoOrEmptyDataAfterTimeout<string | undefined>(
        timeout,
        () => ('deviceMemory' in navigator ? `${navigator.deviceMemory} GiB` : undefined),
        undefined
    );
}

async function getDeviceCpuInfo(timeout = 2000) {

    return getInfoOrEmptyDataAfterTimeout<number | undefined>(
        timeout,
        () => ('hardwareConcurrency' in navigator ? navigator.hardwareConcurrency : undefined),
        undefined
    );
}

async function getGpuInfo(timeout = 2000) {
    return getInfoOrEmptyDataAfterTimeout<object>(
        timeout,
        () => {
            const canvas: HTMLCanvasElement | undefined = document.createElement('canvas');

            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            // @ts-ignore
            const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');

            return {
                // @ts-ignore
                vendor: gl?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                // @ts-ignore
                renderer: gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
            };
        },
        {
            vendor: undefined,
            renderer: undefined,
        }
    );
}

async function getDeviceBatteryInfo(timeout = 2000) {

    return getInfoOrEmptyDataAfterTimeout<object>(
        timeout,
        async () => {
            'getBattery' in navigator && typeof navigator.getBattery === 'function'
                ? // @ts-ignore
                  navigator.getBattery().then((battery) => ({
                      charging: battery.charging,
                      chargingTime: battery.chargingTime,
                      dischargingTime: battery.dischargingTime,
                      level: battery.level,
                  }))
                : {
                      charging: undefined,
                      chargingTime: undefined,
                      dischargingTime: undefined,
                      level: undefined,
                  };
        },
        {
            charging: undefined,
            chargingTime: undefined,
            dischargingTime: undefined,
            level: undefined,
        }
    );
}
