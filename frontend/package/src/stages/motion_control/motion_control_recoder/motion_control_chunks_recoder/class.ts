import { VideoRecoder, videoRecoderFactory } from '../../../../infrastructure';
import { VideoCodec, VideoContainer } from '../../../../shared';
import MotionControlRecoder, { Props } from '../class';

const videoFormatMapping: { [key: string]: VideoContainer } = {
    webm: VideoContainer.WEBM,
    mp4: VideoContainer.MP4,
};

const videoCodecMapping: { [key: string]: VideoCodec } = {
    vp8: VideoCodec.VP8,
    vp9: VideoCodec.VP9,
    h264: VideoCodec.H264,
};

export default class MotionControlChunksRecoder extends MotionControlRecoder {
    private _videoRecoder: VideoRecoder;
    private _videoBuffer: ArrayBuffer = new ArrayBuffer(0);
    private _chunkQueue?: Promise<void> = Promise.resolve();
    private _pendingChunks: number = 0;
    private _isResetting = false;

    private _preferTypes = ['mp4'];
    private _preferCodecs = ['vp8', 'vp9', 'h264'];

    constructor(props: Props) {
        super(props);
        this._identifyAvailableContainerForDevice();
    }

    private _identifyAvailableContainerForDevice() {



        if (!window.navigator.userAgent.includes('iPhone')) {
            this._preferTypes.unshift('webm');
        }
    }

    get container() {
        const { container } = this._getVideoContainerAndCodec();
        return container;
    }

    get codec() {
        const { codec } = this._getVideoContainerAndCodec();
        return codec;
    }

    public initRecoder() {
        const { clientServerConnectionSettings } = this._model;
        this._videoRecoder = videoRecoderFactory({
            stream: this._model.videoSource.stream!,
            preferTypes: this._preferTypes,
            preferCodecs: this._preferCodecs,
            handleDataAvailable: this._handleChunk.bind(this),
            bitrate: clientServerConnectionSettings.videoBitrate,
        });
    }

    public async _handleChunk(event: BlobEvent) {
        if (this._isResetting) return;

        this._pendingChunks++;

        this._chunkQueue = this._chunkQueue?.then(async () => {
            const blob = await event.data.arrayBuffer();
            this._videoBuffer = this._concatenateArrayBuffers([this._videoBuffer, blob]);

            if (this._videoBuffer.byteLength >= 1024 * 20) {
                const bytes = new Uint8Array(this._videoBuffer);
                if (this._handlePieceOfData) this._handlePieceOfData(bytes);
                this._videoBuffer = new ArrayBuffer(0);
            }

            this._pendingChunks--;
        });
    }

    private _concatenateArrayBuffers(buffers: ArrayBuffer[]) {
        const totalLength = buffers.reduce((acc, curr) => acc + curr.byteLength, 0);
        const result = new Uint8Array(totalLength);

        let offset = 0;
        for (const buffer of buffers) {
            result.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }

        return result.buffer;
    }

    public async startRecoding() {
        this._videoRecoder.start(100);
    }

    public _getVideoContainerAndCodec() {
        return {
            container: videoFormatMapping[this._videoRecoder.getVideoType().toLowerCase()],
            codec: videoCodecMapping[this._videoRecoder.getVideoCodec().toLowerCase()],
        };
    }

    async stopRecoding() {
        this._videoRecoder.stop();
        this._chunkQueue = this._chunkQueue?.then(async () => {
            if (this._videoRecoder.isStoped && this._pendingChunks === 0 && this._videoBuffer.byteLength > 0) {
                const bytes = new Uint8Array(this._videoBuffer);
                if (this._handlePieceOfData) this._handlePieceOfData(bytes);
            }
        });
        await this._chunkQueue;
        this._videoBuffer = new ArrayBuffer(0);
    }

    public async resetRecoding() {
        this._isResetting = true;
        this._videoRecoder.stop();

        await this._chunkQueue;

        this._chunkQueue = Promise.resolve();
        this._videoBuffer = new ArrayBuffer(0);
        this._isResetting = false;
    }
}
