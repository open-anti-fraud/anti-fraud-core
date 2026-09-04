import {
    BrowserNotSupportedWorkerApi,
    HardwareAccelerationUnavailableError,
    NotSupportedMediaDevicesError,
    NotSupportedVideoEncoderApiError,
    NotSupportedWebglApiError,
} from './errors';

export default class BrowserApiSupportChecker {
    checkThatSupportMediaDeviceApi() {
        if (
            navigator === undefined ||
            !('mediaDevices' in navigator) ||
            !('getUserMedia' in navigator.mediaDevices) ||
            !('enumerateDevices' in navigator.mediaDevices)
        )
            throw new NotSupportedMediaDevicesError();
    }

    checkThatSupportWorkerApi() {
        if (!window.Worker) throw new BrowserNotSupportedWorkerApi();
    }

    checkThatSupportVideoEncoderApi() {
        if (!window.VideoEncoder) throw new NotSupportedVideoEncoderApiError();
    }

    checkThatSupportWebglApi() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) throw new NotSupportedWebglApiError();

            return gl;
        } catch {
            throw new NotSupportedWebglApiError();
        }
    }

    checkThatSupportHardwareAcceleration(gl: WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
            const softwareRenderer =
                renderer.includes('swiftshader') ||
                renderer.includes('software') ||
                renderer.includes('llvmpipe') ||
                renderer.includes('soft');

            if (softwareRenderer) throw new HardwareAccelerationUnavailableError();
        }
    }
}
