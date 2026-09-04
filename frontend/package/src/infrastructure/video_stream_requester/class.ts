import { CameraResolutions, handleMediaDeviceError, ResolutionsDimensions } from '../../shared';
import { TimeoutAccessToCameraError } from './errors';

export type Props = {
    preferCameraId: string | undefined;
    permissionInBrowserTimeout: number | undefined;
    preferCameraResolution: CameraResolutions | undefined;
};

export default class VideoStreamRequester {
    private _preferCameraId?: string;
    private _preferCameraResolution?: CameraResolutions;
    private _permissionInBrowserTimeout?: number;
    private _timeoutId: NodeJS.Timeout | undefined;

    constructor({ preferCameraId, preferCameraResolution, permissionInBrowserTimeout }: Props) {
        this._preferCameraId = preferCameraId;
        this._preferCameraResolution = preferCameraResolution;
        this._permissionInBrowserTimeout = permissionInBrowserTimeout;
    }

    public setPreferStreamId(id: string) {
        this._preferCameraId = id;
    }

    public async getFromBrowser() {
        try {
            const constraints = this._getConstraints();

            const promises: Promise<MediaStream | Error>[] = [this._getStream(constraints)];
            if (!!this._permissionInBrowserTimeout) promises.push(this._throwErrorByTimeout());
            const result = await Promise.race<MediaStream | Error>(promises);

            if (this._timeoutId) {
                clearTimeout(this._timeoutId);
                this._timeoutId = undefined;
            }

            if (result instanceof Error) throw result;
            return result;
        } catch (err) {
            const error = handleMediaDeviceError(err as Error);
            throw error;
        }
    }

    public _getConstraints(): MediaTrackConstraints {
        const { width: preferStreamWidth, height: preferStreamHeight } = this._preferCameraResolution
            ? ResolutionsDimensions[this._preferCameraResolution]
            : ResolutionsDimensions.hd;

        const constraints: MediaTrackConstraints = {
            facingMode: 'user',
            aspectRatio: 16 / 9,
            width: {
                max: 1920,
                ideal: preferStreamWidth,
            },
            height: {
                max: 1080,
                ideal: preferStreamHeight,
            },
            frameRate: { ideal: 25 },
        };

        if (this._preferCameraId) {
            constraints.deviceId = {
                exact: this._preferCameraId,
            };
        }

        return constraints;
    }

    public async _getStream(constraints: MediaTrackConstraints) {
        return await navigator.mediaDevices.getUserMedia({ video: constraints });
    }

    public _throwErrorByTimeout(): Promise<Error> {
        return new Promise((_, rejects) => {
            this._timeoutId = setTimeout(() => {
                this._timeoutId = undefined;
                rejects(new TimeoutAccessToCameraError());
            }, this._permissionInBrowserTimeout);
        });
    }
}
