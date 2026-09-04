import {
    BoundingBox,
    Events,
    FaceDetectionResult,
    Point3D,
    RawVideoFrame,
    tdvcFaceDetector,
    WebComponentError,
} from '../../shared';
import {
    FaceDetectorRunningError,
    InvalidFrameDataForDetectionError,
    NoFaceDetectorError,
    NoWebGLSupportError,
} from './error';

export default class FaceDetector {
    private _eventHandler = this._handleVideoFrameReceivedEvent.bind(this);

    get status() {
        return tdvcFaceDetector.status;
    }

    public run() {
        window.addEventListener(Events.VIDEO_FRAME_RECEIVED, this._eventHandler);
    }

    public stop() {
        window.removeEventListener(Events.VIDEO_FRAME_RECEIVED, this._eventHandler);
    }

    private _handleVideoFrameReceivedEvent(event: Event) {
        try {
            const rawFrame = this._getDataFromEvent(event);
            this._checkThatRawFrameIsValid(rawFrame);

            const detectedFace = this._estimate(rawFrame.image);
            const customEvent = this._generateFrameProcessedByFaceDetectorEvent({
                ...rawFrame,
                ...detectedFace,
            });
            this._sendCustomEvent(customEvent);
        } catch (err) {
            console.error(err);
            const message = (err as Error)?.message;

            const isWebGlContextError =
                message && typeof message === 'string' && message.includes('Failed to create WebGL context');

            const error =
                err instanceof WebComponentError
                    ? err
                    : isWebGlContextError
                    ? new NoWebGLSupportError()
                    : new FaceDetectorRunningError(message);

            error.dispatch();
        }
    }

    private _getDataFromEvent(event: Event) {
        const data = (event as CustomEvent).detail.data as RawVideoFrame;
        return data;
    }

    private _checkThatRawFrameIsValid(rawFrame: RawVideoFrame) {
        if (!rawFrame.image) throw new InvalidFrameDataForDetectionError();
    }

    private _estimate(image: ImageBitmap) {
        if (!tdvcFaceDetector.detector) throw new NoFaceDetectorError();
        const faces = this._detect(image);



        // https://storage.googleapis.com/mediapipe-assets/documentation/mediapipe_face_landmark_fullsize.png
        const bbox =
            faces.faceLandmarks.length > 0
                ? this._calculateBbox(faces.faceLandmarks[0], image.width, image.height)
                : undefined;

        const result: FaceDetectionResult = {
            bbox,
            keypoints: faces.faceLandmarks[0],
            normalizedKeypoints: this._normilizeKeypoints(faces.faceLandmarks[0], image.width, image.height),
        };

        return result;
    }

    private _detect(image: ImageBitmap) {
        return tdvcFaceDetector.detector!.detectForVideo(image, performance.now());
    }

    private _calculateBbox(keypoints: Point3D[], width: number, height: number): BoundingBox {
        return {
            xMin: keypoints[234].x * width,
            xMax: keypoints[454].x * width,
            yMin: keypoints[10].y * height,
            yMax: keypoints[152].y * height,
            width: (keypoints[454].x - keypoints[234].x) * width,
            height: (keypoints[152].y - keypoints[10].y) * height,
        };
    }

    private _normilizeKeypoints(keypoints: Point3D[], width: number, height: number): Point3D[] {
        return (keypoints ?? []).map((point) => ({
            ...point,
            x: point.x * width,
            y: point.y * height,
        }));
    }

    private _generateFrameProcessedByFaceDetectorEvent(result: (RawVideoFrame & FaceDetectionResult) | undefined) {
        return new CustomEvent(Events.DETECTOR_PROCESSED_FRAME, {
            detail: result,
        });
    }

    public benchmark() {
        let handler: (event: Event) => void;

        return new Promise<number>((resolve, reject) => {
            const limit = 6;
            const detectTime: number[] = [];

            handler = (event: Event) => {
                try {
                    if (!tdvcFaceDetector.detector) throw new NoFaceDetectorError();

                    const rawFrame = this._getDataFromEvent(event);
                    this._checkThatRawFrameIsValid(rawFrame);

                    const time = this._getEstimateTime(rawFrame.image);
                    detectTime.push(time);

                    if (detectTime.length >= limit) {


                        detectTime.shift();
                        detectTime.sort();
                        const value = detectTime.at(-2) ?? Math.max(...detectTime) ?? 33;
                        resolve(value);
                    }
                } catch (err) {
                    console.error(err);
                    const message = (err as Error)?.message;

                    const isWebGlContextError =
                        message && typeof message === 'string' && message.includes('Failed to create WebGL context');

                    const error =
                        err instanceof WebComponentError
                            ? err
                            : isWebGlContextError
                            ? new NoWebGLSupportError()
                            : new FaceDetectorRunningError(message);

                    error.dispatch();
                    reject(error);
                }
            };

            window.addEventListener(Events.VIDEO_FRAME_RECEIVED, handler);
        }).finally(() => {
            window.removeEventListener(Events.VIDEO_FRAME_RECEIVED, handler);
        });
    }

    public _getEstimateTime(image: ImageBitmap) {
        const start = Date.now();
        this._estimate(image);
        const end = Date.now();
        return end - start;
    }

    private _sendCustomEvent(customEvent: CustomEvent) {
        window.dispatchEvent(customEvent);
    }
}
