import { NotSupportedVideoFormatError } from './error';

export type VideoRecoderProps = {
    stream: MediaStream;
    handleDataAvailable?: (event: BlobEvent) => void;
    handleStopRecord?: () => void;
    preferTypes: string[];
    preferCodecs: string[];
    bitrate: number;
};

export default class VideoRecoder {
    private _recoder: MediaRecorder;
    private _isRecoding: boolean = false;
    private _videoType: string;
    private _codec: string;
    private _bitrate: number;

    constructor({ stream, handleDataAvailable, handleStopRecord, preferTypes, preferCodecs, bitrate }: VideoRecoderProps) {
        this._bitrate = bitrate;
        this.defineSupportedVideoTypeAndCodec({ preferTypes, preferCodecs });

        this.setStream({ stream });

        if (handleStopRecord) this.setHandlerStopRecord(handleStopRecord);
        if (handleDataAvailable) {
            this.setHandlerDataAvaliable((event: BlobEvent) => {
                if (this._isRecoding) {
                    handleDataAvailable(event);
                }
            });
        }
    }

    get isStoped() {
        return this._recoder.state === 'inactive';
    }


    private defineSupportedVideoTypeAndCodec({
        preferTypes,
        preferCodecs,
    }: {
        preferTypes: string[];
        preferCodecs: string[];
    }) {
        preferTypes.some((type) => {
            const codec = preferCodecs.find((codec) =>
                MediaRecorder.isTypeSupported(`video/${type}; codec='${codec}'`)
            );


            if (codec) {
                this._codec = codec;
                this._videoType = type;
                return true;
            }

            return false;
        });

        if (!this._videoType || !this._codec) throw new NotSupportedVideoFormatError();
    }

    public getVideoType() {
        return this._videoType;
    }

    public getVideoCodec() {
        return this._codec;
    }

    public setStream({ stream }: { stream: MediaStream }) {
        this._isRecoding = false;
        this._recoder = new MediaRecorder(stream, {
            mimeType: `video/${this._videoType}; codec='${this._codec}'`,
            videoBitsPerSecond: this._bitrate,
        });
    }

    public setHandlerDataAvaliable(handleDataAvailable: ((event: BlobEvent) => void) | null) {
        this._recoder.ondataavailable = handleDataAvailable;
    }

    public setHandlerStopRecord(handleStopRecord: (() => void) | null) {
        this._recoder.onstop = handleStopRecord;
    }

    public start(time?: number) {
        if (time) {
            this._recoder.start(time);
        } else {
            this._recoder.start();
        }

        this._isRecoding = true;
    }

    public stop() {
        if (this._isRecoding) {
            this._recoder.stop();
            this._isRecoding = false;
        }
    }
}
