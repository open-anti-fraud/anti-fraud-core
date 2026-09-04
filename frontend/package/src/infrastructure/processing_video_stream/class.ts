/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    CameraFpsNotDefinedError,
    Events,
    getCustomEventData,
    intervalCheck,
    RawVideoFrame,
    VideoStreamResolutionIsUndefinedError,
    WebComponentError,
} from '../../shared';
import { mediaStreamTrackProcessorReaderFactory, VideoSourceReader } from '../video_source_reader';
import { ProcessingStreamServiceMessages, WorkerAnswer } from './const';
import { InitializationProcessingVideoStremWorkerError, WaitResponseWorkerTimeoutError } from './errors';
import MyWorker from './frame_handler_worker.ts?worker&inline';

export default class ProcessingVideoStream {
    public _worker: Worker;
    public _videoSourceReader?: VideoSourceReader;
    public _cloneTrack?: MediaStreamTrack;

    public _handleMessage = this._handleWorkerMessage.bind(this);
    public _error?: Error;

    public _isFailedCloneReadable = false;
    public _isReadingFrames = false;
    public _frameReader?: Promise<void>;
    public _readable?: ReadableStream<any>;
    public _reader?: ReadableStreamDefaultReader<any>;

    private _isLoaded = false;
    private _waitedAnswer: string | undefined;

    get isLoaded() {
        return this._isLoaded;
    }

    public initWorker() {
        this._error = undefined;
        if (this._isLoaded) return;

        let timerId: NodeJS.Timeout | undefined;
        const stopTimer = () => {
            if (timerId) {
                clearTimeout(timerId);
                timerId = undefined;
            }
        };

        return new Promise((resolve, reject) => {
            timerId = setTimeout(() => {
                timerId = undefined;
                this._error = new WaitResponseWorkerTimeoutError();
                reject(this._error);
            }, 30_000);

            this._worker = new MyWorker();
            this._worker.onmessage = (event) => this._handleInitializedEvent(event, resolve);
            this._worker.onerror = () => this._hanldeInitializedError(reject);
        }).finally(() => stopTimer());
    }

    public _handleInitializedEvent = (event: Event, resolve: (value: unknown) => void) => {
        const message = getCustomEventData<string>(event, 'message');

        if (message === WorkerAnswer.LOADED) {
            this._isLoaded = true;
            this._worker.onerror = this._handleWorkerError;
            this._worker.onmessage = this._handleMessage;
            resolve('Processing video stream worker has been loaded');
        }


        return getCustomEventData<string>(event, 'message');
    };

    public _handleWorkerMessage(event: MessageEvent) {
        const message = getCustomEventData<string>(event, 'message');

        if (message === this._waitedAnswer) {
            this._waitedAnswer = undefined;
        }

        if (
            ![
                WorkerAnswer.INITIALIZED,
                WorkerAnswer.STOPPED_PROCESSING,
                WorkerAnswer.STOPPED_RECODING,
                WorkerAnswer.LOADED,
                WorkerAnswer.VIDEO_FRAME_HANDLED,
                WorkerAnswer.AVERAGE_FRAME_DETECTION_TIME_SETTLED,
                WorkerAnswer.DESTROYED,
            ].includes(message as WorkerAnswer)
        ) {
            const customEvent = this._generateCustomEventFromWorkerEvent(event);
            if (customEvent) window.dispatchEvent(customEvent);
        }

        return getCustomEventData<string>(event, 'message');
    }

    public _generateCustomEventFromWorkerEvent(event: MessageEvent) {
        if (this._error) return;

        const message = getCustomEventData<string>(event, 'message');

        switch (message) {
            case WorkerAnswer.RAW_FRAME_RECEIVED:
                const data = getCustomEventData<RawVideoFrame>(event, 'metadata');
                if (data) return this._generateFrameReceivedEvent(data);

            case WorkerAnswer.ENCODED_FRAME_RECEIVED:
                const chunk = getCustomEventData<Uint8Array>(event, 'chunk');
                if (chunk) return this._generateEncodedFrameReceivedEvent(chunk);

            case WorkerAnswer.ERROR:
                const error = getCustomEventData<{
                    err: Error;
                }>(event, 'metadata');
                this._error = error!.err;
                new WebComponentError({ message: error!.err.message }).dispatch();
                break;

            default:
                this._error = new Error(`An event ${message} is unknow for the system`);
                return this._generateProcessingStreamErrorEvent();
        }
    }

    public _generateFrameReceivedEvent(data: RawVideoFrame) {
        return new CustomEvent(Events.VIDEO_FRAME_RECEIVED, {
            detail: { data },
        });
    }

    public _generateEncodedFrameReceivedEvent(frame: Uint8Array) {
        return new CustomEvent(Events.ENCODED_FRAME_RECEIVED, {
            detail: { frame },
        });
    }

    public _handleWorkerError(event: ErrorEvent) {
        this._error = new Error(event.error);
        return this._generateProcessingStreamErrorEvent();
    }

    public _generateProcessingStreamErrorEvent() {
        return new CustomEvent(Events.PROCESSING_VIDEO_STREAM_ERROR, {
            detail: { error: this._error },
        });
    }

    public _hanldeInitializedError = (reject: (reason?: any) => void) => {
        this._error = new InitializationProcessingVideoStremWorkerError();
        reject(this._error);
    };

    public async waitAnswer(): Promise<void> {
        await intervalCheck(() => !this._waitedAnswer || !!this._error, 100);
        if (this._error) throw this._error;
    }

    public async setTrack(track: MediaStreamTrack) {
        if (!!this._cloneTrack && this._cloneTrack.enabled && this._cloneTrack.readyState === 'live') return;
        await this._createCloneOfVideoTrack(track);
    }

    public async setAverageFaceDetectionTime(ms: number) {
        this._waitedAnswer = WorkerAnswer.AVERAGE_FRAME_DETECTION_TIME_SETTLED;
        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.AVERAGE_FRAME_DETECTION_TIME, {
            time: ms,
        });
        await this.waitAnswer();
    }

    public async _createCloneOfVideoTrack(track: MediaStreamTrack) {
        try {
            this._cloneTrack = track.clone();
        } catch (err) {
            const { deviceId, width, height } = track.getSettings();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId, width, height },
            });
            this._cloneTrack = stream.getVideoTracks()[0];
        }

        track.onended = () => this._cloneTrack?.stop();
    }

    public async initializingMediaTrackProcessor(isAppleMobile: boolean) {
        try {
            this._videoSourceReader = mediaStreamTrackProcessorReaderFactory(this._cloneTrack!);

            const { metadata, transfer } = isAppleMobile
                ? this._getTrackDataToWorker()
                : this._getReadableDataToWorker();

            this._waitedAnswer = WorkerAnswer.INITIALIZED;
            this._sendMessageIntoWorker(
                ProcessingStreamServiceMessages.INITIALIZE,
                { ...metadata, isAppleMobile },
                transfer
            );
            await this.waitAnswer();
        } catch (err) {
            console.error(err);
            this._waitedAnswer = undefined;
            this._isFailedCloneReadable = true;
            if (!this._readable) {
                this._readable = this._videoSourceReader!.readable!;
                this._reader = this._readable.getReader();
            }
        }
    }

    public _getTrackDataToWorker() {
        const cloneTrack = this._videoSourceReader?.videoTrack;
        if (!cloneTrack) throw new Error('No video source track');
        return {
            metadata: { track: cloneTrack },
            transfer: [cloneTrack],
        };
    }

    public _getReadableDataToWorker() {
        const readable = this._videoSourceReader?.readable;
        if (!readable) throw new Error('No video source reader');
        return {
            metadata: { readable },
            transfer: [readable],
        };
    }

    public async initEncoder({
        codec,
        hardwareAcceleration,
        bitrate,
        encoderKeyframeRate,
    }: {
        codec: string;
        hardwareAcceleration: string;
        bitrate: number;
        encoderKeyframeRate: number;
    }) {
        const settings = this._cloneTrack?.getSettings();
        const resoulution = this._getTrackResolution(settings!);
        const fps = this._getTrackFps(settings!);

        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.SEND_ENCODING_METADATA, {
            fps: Math.floor(fps),
            width: resoulution.width,
            height: resoulution.height,
            codec,
            hardwareAcceleration,
            bitrate,
            encoderKeyframeRate,
        });
    }

    public _getTrackResolution(settings: MediaTrackSettings) {
        if (!settings?.width || !settings?.height) throw new VideoStreamResolutionIsUndefinedError();
        if (!settings?.frameRate) throw new CameraFpsNotDefinedError();

        return {
            width: settings.width,
            height: settings.height,
        };
    }

    public _getTrackFps(settings: MediaTrackSettings) {
        if (!settings?.frameRate) throw new CameraFpsNotDefinedError();
        return settings.frameRate;
    }

    public startProcessingStream(videoId: string = '00000000-0000-0000-0000-000000000000') {
        this.setVideoId(videoId);

        if (this._isFailedCloneReadable) {
            this._frameReader = this._startReadingFrame();
            return;
        }

        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.START_PROCESSING);
    }

    public setVideoId(videoId: string) {
        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.SET_VIDEO_ID, { videoId });
    }

    public async _startReadingFrame() {
        if (!this._reader) throw new Error('No reader object');

        try {
            this._isReadingFrames = true;
            let isEndFrame = false;

            while (this._isReadingFrames && !isEndFrame) {
                const { done, value } = await this._reader.read();
                isEndFrame = done;

                if (value && !isEndFrame)
                    this._sendMessageIntoWorker(ProcessingStreamServiceMessages.HANDLE_VIDEO_FRAME, { frame: value }, [
                        value,
                    ]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            this._isReadingFrames = false;
        }
    }

    public async stopProcessingStream() {
        if (!this.isLoaded) return;

        this._waitedAnswer = WorkerAnswer.STOPPED_PROCESSING;
        if (this._isFailedCloneReadable) {
            this._isReadingFrames = false;
            await this._frameReader;
            this._frameReader = undefined;
        }

        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.STOP_PROCESSING);
        await this.waitAnswer();
    }

    public startRecodingVideo() {
        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.START_RECODING);
    }

    public async stopRecodingVideo() {
        this._waitedAnswer = WorkerAnswer.STOPPED_RECODING;
        this._sendMessageIntoWorker(ProcessingStreamServiceMessages.STOP_RECODING);
        await this.waitAnswer();
    }

    public async destroy() {
        if (
            this._worker &&
            (!this._error ||
                !WebComponentError.typeof(this._error.name, InitializationProcessingVideoStremWorkerError.ERROR_NAME))
        ) {
            this._waitedAnswer = WorkerAnswer.DESTROYED;
            this._sendMessageIntoWorker(ProcessingStreamServiceMessages.DESTROY);
            await this.waitAnswer();
        }

        this.stopCloneTrack();
        this._terminateWorker();

        this._videoSourceReader?.destroy();
        this._reader = undefined!;
        this._readable = undefined!;
        this._frameReader = undefined!;

        this._handleMessage = undefined!;
        this._error = undefined!;

        this._isLoaded = false;
    }

    public stopCloneTrack() {
        this._cloneTrack?.stop();
        this._cloneTrack = undefined;
    }

    public _terminateWorker() {
        if (this._worker) {
            this._worker.onerror = null;
            this._worker.onmessage = null;
            this._worker.terminate();
            this._worker = undefined!;
        }
    }

    public _sendMessageIntoWorker(action: string, metadata?: object, transfer?: Transferable[]) {
        this._worker?.postMessage(
            {
                action,
                metadata,
            },
            transfer ?? []
        );
    }
}
