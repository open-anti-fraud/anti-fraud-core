import { NotSupportedApiError } from '../../shared';
import { InactiveVideoTrackError, NoVideoTrackError } from './errors';

export default class VideoTrack {
    private _track: MediaStreamTrack | undefined;
    public readonly settings: MediaTrackSettings;
    public readonly constraints: MediaTrackConstraints;
    public readonly capabilities: MediaTrackCapabilities;

    constructor(stream: MediaStream) {
        const tracks = stream.getVideoTracks();
        if (tracks.length === 0) throw new NoVideoTrackError();

        this._track = tracks[0];

        try {
            this.settings = this._track.getSettings();
            this.constraints = this._track.getConstraints();
            this.capabilities = this._track.getCapabilities();
        } catch (err) {
            throw new NotSupportedApiError();
        }
    }

    get track() {
        return this._track as Readonly<MediaStreamTrack>;
    }

    public checkThatTrackIsExist() {
        if (!this.isExist) throw new NoVideoTrackError();
    }

    public isExist() {
        return !!this._track;
    }

    public checkThatTrackIsLive() {
        if (!this.isLive()) throw new InactiveVideoTrackError();
    }

    public isLive() {
        return this._track?.readyState === 'live';
    }

    public checkThatTrackIsEnabled() {
        if (!this.isLive()) throw new InactiveVideoTrackError();
    }

    public isEnabled() {
        return this._track?.enabled;
    }

    stop() {
        this._track?.stop();
    }

    destroy() {
        this.stop();
        this._track = undefined;
    }

    // public getStreamResoulutionForFaceBorderPosition() {
    //     const capabilities = this.getStreamCapabilities();
    //     let width = Number(capabilities?.width?.max);
    //     let height = Number(capabilities?.height?.max);
    //     if (
    //         capabilities.width?.max === undefined ||
    //         Number.isNaN(width) ||
    //         !capabilities.height?.max === undefined ||
    //         Number.isNaN(height)
    //     ) {
    //         getLoggingService()?.addCriticalErrorLog(
    //             `Error occur when get stream resoulution for face border position: max width: ${capabilities?.width?.max}, max height: ${capabilities?.height?.max}`
    //         );
    //         throw new NoCameraCapabilitiesInfoError();
    //     }
    //     const isFullHd = width >= 1920 && height >= 1080;
    //     const isHd = width >= 1280 && height >= 720;
    //     const isXGA = width >= 1024 && height >= 768;
    //     if (isFullHd) {
    //         width = 1920;
    //         height = 1080;
    //     } else if (isHd) {
    //         width = 1280;
    //         height = 720;
    //     } else if (isXGA) {
    //         width = 1024;
    //         height = 768;
    //     } else {
    //         width = 640;
    //         height = 480;
    //     }
    //     return {
    //         width,
    //         height,
    //     };
    // }
}
