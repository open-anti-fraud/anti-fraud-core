import {
    CameraFpsNotDefinedError,
    Events,
    VideoCodec,
    VideoContainer,
    VideoStreamResolutionIsUndefinedError,
} from '../../../../shared';
import { NoSupportedVideoCodecError } from '../../errors';
import MotionControlRecoder, { Props } from '../class';

const codecMapping: { [key: string]: number } = {
    'vp09.00.10.08': VideoCodec.VP9,
    vp8: VideoCodec.VP8,
    'avc1.42E028': VideoCodec.H264,
};

const containerMapping: { [key: string]: number } = {
    'vp09.00.10.08': VideoContainer.WEBM,
    vp8: VideoContainer.WEBM,
    'avc1.42E028': VideoContainer.MP4,
};

export default class MotionControlPacketsRecoder extends MotionControlRecoder {
    private _handleEncodedVideoFrame = this._handleEncodedVideoFrameEvent.bind(this);
    private _codec: string | undefined;

    constructor(props: Props) {
        super(props);
    }

    get container() {
        if (!this._codec) throw new NoSupportedVideoCodecError();
        return containerMapping[this._codec];
    }

    get codec() {
        if (!this._codec) throw new NoSupportedVideoCodecError();
        return codecMapping[this._codec];
    }

    public async initRecoder() {
        this._services.browserSupportApiChecker?.checkThatSupportVideoEncoderApi();
        this._codec = await this._getSupportedVideoEncoderCodec();
        if (!this._codec) throw new NoSupportedVideoCodecError();
    }

    public async startRecoding(videoId: string) {
        const { processingVideoStream, customEventsListeners } = this._services;
        const { clientServerConnectionSettings } = this._model;

        const frameRate = this._model.videoSource.videoTrack!.settings.frameRate;
        if (!frameRate) throw new CameraFpsNotDefinedError();
        if (!this._codec) throw new NoSupportedVideoCodecError();

        processingVideoStream!.startProcessingStream(videoId);
        processingVideoStream!.initEncoder({
            codec: this._codec,
            bitrate: clientServerConnectionSettings.videoBitrate,
            encoderKeyframeRate: Math.ceil(
                Math.floor(frameRate) / clientServerConnectionSettings.requiredReferenceFrameCount
            ),
            hardwareAcceleration: 'no-preference',
        });

        customEventsListeners?.addListener(Events.ENCODED_FRAME_RECEIVED, this._handleEncodedVideoFrame);

        processingVideoStream!.startRecodingVideo();
    }

    private async _getSupportedVideoEncoderCodec() {
        const codecs = ['vp09.00.10.08', 'vp8', 'avc1.42E028'];

        const { width, height } = this._model.videoSource.videoTrack!.settings;
        if (!width || !height) throw new VideoStreamResolutionIsUndefinedError();

        try {
            for (const codec of codecs) {
                const result = await VideoEncoder.isConfigSupported({
                    codec,
                    width,
                    height,
                    hardwareAcceleration: 'no-preference',
                });
                if (result.supported) return codec;
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    private _handleEncodedVideoFrameEvent(event: Event) {
        // @ts-ignore
        const { frame } = event.detail;
        if (this._handlePieceOfData) this._handlePieceOfData(frame);
    }

    public async resetRecoding() {
        const { processingVideoStream, customEventsListeners } = this._services;
        customEventsListeners!.removeListener(Events.ENCODED_FRAME_RECEIVED, this._handleEncodedVideoFrame);
        await processingVideoStream!.stopRecodingVideo();
    }

    public async stopRecoding() {
        const { processingVideoStream, customEventsListeners } = this._services;
        customEventsListeners!.removeListener(Events.ENCODED_FRAME_RECEIVED, this._handleEncodedVideoFrame);
        await processingVideoStream!.stopRecodingVideo();
    }
}
