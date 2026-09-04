import { Endeavor } from '../../../domain';
import {
    CustomEventsListeners,
    Device,
    FaceDetector,
    FaceDetectorInitiliazer,
    Logger,
    NormalizationCalculator,
    ObjectFit,
    VideoTrack,
} from '../../../infrastructure';
import { ProcessingVideoStream } from '../../../infrastructure/processing_video_stream';
import {
    Events,
    FaceDetectionResult,
    FaceDetectorSettings,
    getObjectFitProperty,
    intervalCheckWithTimeout,
    serializeObject,
    tdvcFaceDetector,
} from '../../../shared';
import { FaceKeypointsMask } from '../../../ui';
import { PrepareEnvironmentForBiometricInspectionTimeoutError } from '../web_component.error';
import Services from '../web_component.services';
import View from '../web_component.view';

export async function initProcessingVideoStream(
    processingVideoStream: ProcessingVideoStream | undefined,
    logger?: Logger
) {
    if (processingVideoStream === undefined) {
        logger?.addWarningLog(
            'Initialization processing video stream worker has been canceled because processingVideoStream is undefined'
        );
        return;
    }

    logger?.addDebugLog('Initialization processing video stream worker has been started');
    await processingVideoStream!.initWorker();
    logger?.addDebugLog('Initialization processing video stream worker has been finished');
}

export async function initFaceDetector(
    faceDetectorInitiliazer: typeof FaceDetectorInitiliazer | undefined,
    path: string,
    settings: FaceDetectorSettings,
    logger?: Logger
) {
    logger?.addDebugLog('Initialization face detector has been started');

    try {
        await faceDetectorInitiliazer?.initDetector(path, settings.detectorOptions, settings.heathcheckImagePath);
    } catch (err) {
        logger?.addWarningLog('Initialization face detector has been faield');
        logger?.addErrorLog(`Initialization face detector error: ${tdvcFaceDetector.errorMessage}`);
        throw err;
    }

    if (logger) {
        logger.addDebugLog('Initialization face detector has been finished');
        const options = serializeObject(faceDetectorInitiliazer?.detectorOptions);
        logger.addDebugLog(`Face detector settings: ${options}`);
    }
}

export async function prepareViewForBiometricInspection(
    view: View,
    stream: MediaStream | undefined,
    normalizationCalculator: NormalizationCalculator | undefined,
    customEventsListeners: CustomEventsListeners | undefined,
    logger?: Logger
) {
    logger?.addDebugLog('Preparing view for biometric inspection has been started');

    view.renderContentLayout();

    logger?.addDebugLog('Rendering camera preview has been started');
    await view.renderCameraPreview(stream);
    logger?.addDebugLog('Rendering camera preview has been finished');

    logger?.addDebugLog('Resizing canvases has been started');
    view.updateCanvasResolution();
    logger?.addDebugLog('Resizing canvases has been finished');

    logger?.addDebugLog('Rendering text hints has been started');
    view.renderTextHints();
    logger?.addDebugLog('Rendering text hints mask has been finished');

    logger?.addDebugLog('Rendering face keypoint mask has been started');
    view.renderFaceKeypointMask();
    logger?.addDebugLog('Rendering face keypoint mask has been finished');

    logger?.addDebugLog('Preparing view for biometric inspection has been finished');

    startHandleDetectedFaceEvent(customEventsListeners!, normalizationCalculator!, view.faceKeypointMask);
}

export async function runBiometricSerivces(
    videoTrack: VideoTrack,
    processingVideoStream: ProcessingVideoStream | undefined,
    device: Device | undefined,
    customEventsListeners: CustomEventsListeners | undefined,
    logger?: Logger
) {
    startLogVideoFrame(customEventsListeners!, logger);
    startLogDetection(customEventsListeners!, logger);

    logger?.addDebugLog('Setting video track for processing video stream has been started');
    await processingVideoStream!.setTrack(videoTrack.track);
    logger?.addDebugLog('Setting video track for processing video stream has been finished');

    logger?.addDebugLog('Initializing media track processor has been started');
    await processingVideoStream?.initializingMediaTrackProcessor(device!.isAppleMobile());
    logger?.addDebugLog('Initializing media track processor has been finished');

    logger?.addDebugLog('Starting processing video');
    processingVideoStream!.startProcessingStream();
}

export function removeViewForBiometricInspection(view: View, customEventsListeners: CustomEventsListeners | undefined) {
    stopHandleDetectedFaceEvent(customEventsListeners!);
    view.cameraPreview?.destroy();
    view.relativeContainer?.destroy();
    view.textHints?.removeFromDom();
}

export async function stopBiometricSerivces(
    processingVideoStream: ProcessingVideoStream | undefined,
    faceDetector: FaceDetector | undefined,
    customEventsListeners: CustomEventsListeners | undefined,
    logger?: Logger
) {
    stopLogVideoFrame(customEventsListeners!);
    stopLogDetection(customEventsListeners!);

    logger?.addDebugLog('Stopping processing video stream has been started');
    await processingVideoStream?.stopProcessingStream();
    logger?.addDebugLog('Stopping processing video stream has been finished');

    logger?.addDebugLog('Stopping processing video stream track has been started');
    processingVideoStream?.stopCloneTrack();
    logger?.addDebugLog('Stopping processing video stream track has been finished');

    logger?.addDebugLog('Stopping face detector has been started');
    faceDetector?.stop();
    logger?.addDebugLog('Stopping face detector has been finished');
}

let handleDetection: ((event: Event) => void) | undefined;
let lastDetectionTimer: NodeJS.Timeout | undefined;

export function startLogDetection(customEventsListeners: CustomEventsListeners, logger?: Logger) {
    if (handleDetection !== undefined) return;
    handleDetection = () => handleDetectionEvent(logger);
    customEventsListeners?.addListener(Events.DETECTOR_PROCESSED_FRAME, handleDetection);
}

function handleDetectionEvent(logger?: Logger) {
    if (lastDetectionTimer) clearTimeout(lastDetectionTimer);
    lastDetectionTimer = setTimeout(() => {
        logger?.addDebugLog('Detection not received longer then 3 seconds');
    }, 3000);
}

export function stopLogDetection(customEventsListeners: CustomEventsListeners) {
    if (lastDetectionTimer) {
        clearTimeout(lastDetectionTimer);
        lastDetectionTimer = undefined;
    }

    if (handleDetection) {
        customEventsListeners?.removeListener(Events.DETECTOR_PROCESSED_FRAME, handleDetection);
        handleDetection = undefined;
    }
}

let handleRawFrame: ((event: Event) => void) | undefined;
let lastVideoFrameTimer: NodeJS.Timeout | undefined;

export function startLogVideoFrame(customEventsListeners: CustomEventsListeners, logger?: Logger) {
    if (handleRawFrame !== undefined) return;
    handleRawFrame = () => handleRawFrameEvent(logger);
    customEventsListeners?.addListener(Events.VIDEO_FRAME_RECEIVED, handleRawFrame);
}

function handleRawFrameEvent(logger?: Logger) {
    if (lastVideoFrameTimer) clearTimeout(lastVideoFrameTimer);
    lastVideoFrameTimer = setTimeout(() => {
        logger?.addDebugLog('Video frame not received longer then 3 seconds');
    }, 3000);
}

export function stopLogVideoFrame(customEventsListeners: CustomEventsListeners) {
    if (lastVideoFrameTimer) clearTimeout(lastVideoFrameTimer);
    if (handleRawFrame) {
        customEventsListeners?.removeListener(Events.VIDEO_FRAME_RECEIVED, handleRawFrame);
        handleRawFrame = undefined;
    }
}

let renderFaceMask: ((event: Event) => void) | undefined;

export function startHandleDetectedFaceEvent(
    customEventsListeners: CustomEventsListeners,
    normalizationCalculator: NormalizationCalculator,
    faceKeypointMask: FaceKeypointsMask
) {
    if (renderFaceMask !== undefined) return;
    renderFaceMask = (event: Event) => handleDetectiedFaceEvent(event, normalizationCalculator, faceKeypointMask);
    customEventsListeners?.addListener(Events.DETECTOR_PROCESSED_FRAME, renderFaceMask);
}

export function stopHandleDetectedFaceEvent(customEventsListeners: CustomEventsListeners) {
    if (renderFaceMask) {
        customEventsListeners?.removeListener(Events.DETECTOR_PROCESSED_FRAME, renderFaceMask);
        renderFaceMask = undefined;
    }
}

export function handleDetectiedFaceEvent(
    event: Event,
    normalizationCalculator: NormalizationCalculator,
    faceKeypointMask: FaceKeypointsMask
) {
    if (!faceKeypointMask.root.parentNode) return;

    const { normalizationCoefficients, coordinatesOffset } = normalizationCalculator!;
    const { normalizedKeypoints } = (event as CustomEvent<FaceDetectionResult>).detail;
    const points =
        normalizedKeypoints?.map((point) => ({
            x: point.x * normalizationCoefficients.x - coordinatesOffset.x,
            y: point.y * normalizationCoefficients.y - coordinatesOffset.y,
        })) ?? [];

    faceKeypointMask.clear();
    faceKeypointMask.draw(points);
}

export async function setAverageFaceDetectionTime(
    faceDetectorSettings: FaceDetectorSettings,
    processingVideoStream: ProcessingVideoStream | undefined,
    faceDetector: FaceDetector | undefined,
    logger?: Logger
) {
    if (!faceDetectorSettings.modelEnabled) {
        logger?.addDebugLog('Setting average face detection time has been cancel because face detector disabled');
        return;
    }

    logger?.addDebugLog('Identifying average face detection time has been started');
    const time = await faceDetector!.benchmark();
    logger?.addDebugLog('Identifying average face detection time has been finished');
    logger?.addDebugLog(`Average face detection time: ${time} ms`);

    logger?.addDebugLog('Stopping processing video stream has been started');
    await processingVideoStream?.stopProcessingStream();
    logger?.addDebugLog('Stopping processing video stream has been finished');

    logger?.addDebugLog('Setting average face detection time for processing video stream has been started');
    await processingVideoStream!.setAverageFaceDetectionTime(time * 1000);
    logger?.addDebugLog('Setting average face detection time for processing video stream has been finished');

    logger?.addDebugLog('Starting processing video');
    await processingVideoStream?.startProcessingStream();

    logger?.addDebugLog('Starting face detection');
    faceDetector?.run();
}

export function calculateNormalizationCoefficients(
    view: View,
    normalizationCalculator?: NormalizationCalculator,
    logger?: Logger
) {
    logger?.addDebugLog('Calculating normalization coefficients has been started');

    const previewResolution = view.cameraPreview!.getPreviewResolution();
    logger?.addDebugLog(`Preview resolution: ${previewResolution.width}/${previewResolution.height}`);

    const streamResolution = view.cameraPreview!.getVideoResolution();
    logger?.addDebugLog(`Video track resolution: ${streamResolution.width}/${streamResolution.height}`);

    const objectFit = getObjectFitProperty(view.cameraPreview.root) as ObjectFit;
    logger?.addDebugLog(`Object fit for preview: ${objectFit}`);

    normalizationCalculator!.calculate(previewResolution, streamResolution, objectFit);
    const { coordinatesOffset, normalizationCoefficients } = normalizationCalculator!;
    logger?.addDebugLog(`Normalization coefficients: ${serializeObject(normalizationCoefficients)}`);
    logger?.addDebugLog(`Coordinates offset: ${serializeObject(coordinatesOffset)}`);

    logger?.addDebugLog('Calculating normalization coefficients has been finished');
}

export async function prepareConnection(
    model: { baseUrl: string; endeavor: Endeavor; token: string; correlationId: string },
    services: Services
) {
    const { correlationId, endeavor, baseUrl, token } = model;

    services.initInspectionTransport({
        baseUrl,
        endeavorId: endeavor!.id,
        correlationId: correlationId!,
        token,
    });

    services?.logger?.addDebugLog('Openning connection has been started');
    await services.inspectionTransport?.openConnection();
    services?.logger?.addDebugLog('Openning connection has been finished');
}

export async function waitWhileReadyForBiometricInspection(fn: () => boolean, logger?: Logger) {
    logger?.addDebugLog('Checking that environment ready for biometric inspection has been starting');
    await intervalCheckWithTimeout(
        fn,
        () => {
            logger?.addDebugLog('Checking that environment ready for biometric inspection has been stopped by timeout');
            throw new PrepareEnvironmentForBiometricInspectionTimeoutError();
        },
        60_000,
        3000
    );
    logger?.addDebugLog('Checking that environment ready for biometric inspection has been finished');
}
