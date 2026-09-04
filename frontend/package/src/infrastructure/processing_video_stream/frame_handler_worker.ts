/// <reference lib="webworker" />

/* eslint-disable @typescript-eslint/no-explicit-any */
import { RawVideoFrame } from '../../shared';
import { mediaStreamTrackProcessorReaderFactory } from '../video_source_reader';
import { ProcessingStreamServiceMessages, WorkerAnswer } from './const';

sendMessageToMainThread(WorkerAnswer.LOADED);

let readable: any;
let reader: any;
let encoder: VideoEncoder | undefined;
let firstFrameTimestamp: number | undefined;
let track: MediaStreamTrack;
let frameIndex: number = 0;
let encoderKeyframeRate = 30;
let videoId: string = '00000000-0000-0000-0000-000000000000';
let isProcessing = false;
let isRecoding = false;
let processingPromise: Promise<unknown> | undefined;
let timeGap = 1_000_000 / 25;
let lastSendTime: number | undefined = undefined;

onmessage = async (event: Event) => {
    if (
        typeof event === 'object' &&
        'data' in event &&
        typeof event.data === 'object' &&
        event.data != null &&
        'action' in event.data
    ) {
        if (event.data.action === ProcessingStreamServiceMessages.INITIALIZE) {
            // @ts-ignore
            readable = event.data.metadata.readable;
            // @ts-ignore
            const isAppleMobile = !!event.data.metadata.isAppleMobile;

            if (!readable) {
                // @ts-ignore
                track = event.data.metadata.track as MediaStreamTrack;
                const processor = mediaStreamTrackProcessorReaderFactory(track);
                readable = processor.readable;
            }

            if (isAppleMobile) readable = readable.pipeThrough(rotatedOn90DegreeStream());
            reader = readable.getReader();
            sendMessageToMainThread(WorkerAnswer.INITIALIZED);
        }

        if (event.data.action === ProcessingStreamServiceMessages.AVERAGE_FRAME_DETECTION_TIME) {
            //@ts-ignore
            const metadata = event.data?.metadata;
            timeGap = metadata.time ?? 1_000_000 / 25;
            sendMessageToMainThread(WorkerAnswer.AVERAGE_FRAME_DETECTION_TIME_SETTLED);
        }

        if (event.data.action === ProcessingStreamServiceMessages.SET_VIDEO_ID) {
            //@ts-ignore
            const metadata = event.data?.metadata;
            videoId = metadata.videoId;
            lastSendTime = undefined;
            firstFrameTimestamp = undefined;
            frameIndex = 0;
        }

        if (event.data.action === ProcessingStreamServiceMessages.START_PROCESSING) {
            isProcessing = true;
            processingPromise = startProcessingStream();
        }

        if (event.data.action === ProcessingStreamServiceMessages.HANDLE_VIDEO_FRAME) {
            isProcessing = true;
            //@ts-ignore
            await handleVideoFrame(event.data?.metadata.frame);
            sendMessageToMainThread(WorkerAnswer.VIDEO_FRAME_HANDLED);
        }

        if (event.data.action === ProcessingStreamServiceMessages.STOP_PROCESSING) {
            isProcessing = false;

            if (processingPromise) {
                await processingPromise;
                processingPromise = undefined;
            }

            await stopEncoder();

            frameIndex = 0;
            videoId = '00000000-0000-0000-0000-000000000000';

            sendMessageToMainThread(WorkerAnswer.STOPPED_PROCESSING);
        }

        if (event.data.action === ProcessingStreamServiceMessages.SEND_ENCODING_METADATA && 'metadata' in event.data) {
            const metadata = event.data.metadata as {
                fps: number;
                width: number;
                height: number;
                codec: string;
                bitrate: number;
                hardwareAcceleration: string;
                encoderKeyframeRate: number;
            };

            encoderKeyframeRate = metadata.encoderKeyframeRate;
            encoder = await createVideoEncoder(metadata);
        }

        if (event.data.action === ProcessingStreamServiceMessages.START_RECODING) {
            lastSendTime = undefined;
            firstFrameTimestamp = undefined;
            isRecoding = true;
            frameIndex = 0;
        }

        if (event.data.action === ProcessingStreamServiceMessages.STOP_RECODING) {
            frameIndex = 0;
            isRecoding = false;
            await stopEncoder();
            sendMessageToMainThread(WorkerAnswer.STOPPED_RECODING);
        }

        if (event.data.action === ProcessingStreamServiceMessages.DESTROY) {
            isProcessing = false;
            frameIndex = 0;
            track?.stop();
            track = undefined!;

            await stopEncoder();

            if (processingPromise) {
                await processingPromise;
                processingPromise = undefined;
            }

            sendMessageToMainThread(WorkerAnswer.DESTROYED);
        }
    }
};

function sendMessageToMainThread(message: string, metadata?: object) {
    self.postMessage({
        message: message,
        metadata: metadata,
    });
}

async function sendReceivedFrame(frame: VideoFrame, frameIndex: number | undefined) {
    if (!isProcessing) return;

    try {
        const image = await createImageBitmap(frame);
        self.postMessage(
            {
                message: WorkerAnswer.RAW_FRAME_RECEIVED,
                metadata: { image: image, index: frameIndex, videoId, timestamp: frame.timestamp } as RawVideoFrame,
            },
            // @ts-ignore
            [image]
        );
    } catch (err) {
        console.error(err);
        if (err instanceof DOMException && err.name === 'DataCloneError') return;
        sendMessageToMainThread(WorkerAnswer.ERROR, { err });
    }
}

async function startProcessingStream() {
    let frame: VideoFrame | undefined;
    if (!readable) throw new Error('Readable is undefiend');

    try {
        while (isProcessing) {
            try {
                const { done, value } = await reader.read();
                frame = value;

                if (done) break;
                if (!frame) continue;

                await Promise.all([handleFrame(frame!), encodeFrame(frame!)]);
            } finally {
                frame?.close();
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleFrame(frame: VideoFrame) {
    if (!lastSendTime || frame.timestamp - lastSendTime > timeGap) {
        await sendReceivedFrame(frame, frameIndex);
        lastSendTime = frame.timestamp;
    }
}

function encodeFrame(frame: VideoFrame) {
    if (isRecoding && encoder && encoder.encodeQueueSize < 2) {
        frameIndex = (frameIndex as number) + 1;
        encoder.encode(frame, {
            keyFrame: frameIndex % encoderKeyframeRate === 1,
        });
    } else if (!encoder) {
        frameIndex = (frameIndex as number) + 1;
    }
}

async function handleVideoFrame(frame: VideoFrame) {
    try {
        await Promise.all([handleFrame(frame), encodeFrame(frame)]);
    } catch (err) {
        console.error(err);
    } finally {
        frame?.close();
    }
}

async function stopEncoder() {
    try {
        await encoder?.flush();
    } finally {
        encoder?.close();
        encoder = undefined;
    }
}

async function createVideoEncoder({
    fps,
    width,
    height,
    codec,
    bitrate,
    hardwareAcceleration,
}: {
    fps: number;
    width: number;
    height: number;
    codec: string;
    bitrate: number;
    hardwareAcceleration: string;
}) {
    const videoEncoderConfiguration: VideoEncoderConfig = {
        codec,
        width: width,
        height: height,
        framerate: fps,
        bitrate,
        hardwareAcceleration: hardwareAcceleration as HardwareAcceleration,
    };

    await VideoEncoder.isConfigSupported(videoEncoderConfiguration);

    const videoEncoder = new VideoEncoder({
        output: handleChunk,
        error: (err) => console.error(err),
    });
    videoEncoder.configure(videoEncoderConfiguration);

    return videoEncoder;
}

async function handleChunk(chunk: EncodedVideoChunk) {
    const metadata = new Uint8Array(13);
    const view = new DataView(metadata.buffer);

    view.setUint8(0, chunk.type === 'key' ? 1 : 0); // 1 byte

    const timestamp = Math.floor(chunk.timestamp / 1000);
    if (!firstFrameTimestamp) {
        firstFrameTimestamp = timestamp;
    }

    view.setBigUint64(1, BigInt(timestamp - firstFrameTimestamp), true);
    view.setUint32(9, chunk.byteLength); // 4 bytes

    const chunkData = new Uint8Array(chunk.byteLength);
    chunk.copyTo(chunkData);

    const ivfChunk = new Uint8Array(metadata.byteLength + chunk.byteLength);
    ivfChunk.set(metadata, 0);
    ivfChunk.set(chunkData, metadata.byteLength);

    self.postMessage({
        message: WorkerAnswer.ENCODED_FRAME_RECEIVED,
        chunk: ivfChunk,
    });
}

function rotatedOn90DegreeStream(): TransformStream<VideoFrame, VideoFrame> {
    return new TransformStream<VideoFrame, VideoFrame>({
        async transform(frame, controller) {
            if (frame.displayHeight < frame.displayWidth) {
                const canvas = new OffscreenCanvas(frame.displayHeight, frame.displayWidth);
                const ctx = canvas.getContext('2d');
                ctx!.translate(canvas.width, 0);
                ctx!.rotate(Math.PI / 2);
                ctx!.drawImage(frame, 0, 0);

                // @ts-ignore
                const rotatedFrame = new VideoFrame(canvas, {
                    timestamp: frame.timestamp,
                    duration: frame.duration,
                });

                controller.enqueue(rotatedFrame);
                frame.close();
            } else {
                controller.enqueue(frame);
            }
        },
    });
}
