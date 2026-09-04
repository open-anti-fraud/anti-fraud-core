import { Inspection, InspectionsWebSocketTransport, RequestMessageType } from '../../infrastructure';
import {
    CameraFpsNotDefinedError,
    convertImageBitmapToArrayBuffer,
    Events,
    FaceDetectionResult,
    FaceDetectorSettingsBlock,
    getScaledBbox,
    intervalCheckWithTimeout,
    MotionControlActions,
    MotionControlPatternResult,
    MotionControlSettingsBlock,
    onMotionCallback,
    RawVideoFrame,
    serializeObject,
    ServerConnectionSettingsBlock,
    Stage,
    timer,
    TransmissionTimeoutError,
    TransportError,
    VideoStreamResolutionIsUndefinedError,
    WebComponentError,
} from '../../shared';

import {
    FlowBestshotMeta,
    FlowInitialPositionMeta,
    FlowMotionControlMeta,
    FlowVideoSourceMeta,
} from '../../application';
import { Services, View } from '../../modes/_core';
import { InvalidVideoDataError } from './errors';
import { MotionControl, motionControlFactory } from './motion_control';
import { MotionControlPacketsRecoder, MotionControlRecoder } from './motion_control_recoder';
import motionControlRecoderFactory from './motion_control_recoder/factory';

type Model = {
    videoSource: FlowVideoSourceMeta;
    initialPosition: FlowInitialPositionMeta;
    bestshots: FlowBestshotMeta;
    motionControlMeta: FlowMotionControlMeta;
} & MotionControlSettingsBlock &
    ServerConnectionSettingsBlock &
    FaceDetectorSettingsBlock & { onMotion?: onMotionCallback };

export type Props = {
    model: Model;
    view: View;
    services: Services;
};

export default class MotionControlStage implements Stage {
    name = 'MotionControlStage';

    private _model: Model;
    private _view: View;
    private _services: Services;

    private _motionControlVideoRecoder: MotionControlRecoder;

    private _handleChangeCurrentAction = this._handleMotionControlActionEvent.bind(this);
    private _handleCurrentValidationActionScore = this._handleCurrentValidationActionScoreEvent.bind(this);
    private _handleBestshots = this._handleBesthotsEvents.bind(this);

    private _actionsFrames: ImageBitmap[] = [];

    private _transportError: WebComponentError | undefined;
    private _transportAwaitedResponse: string | undefined;
    private _unsubscribeMethod: () => void;

    constructor(props: Props) {
        this._model = props.model;
        this._view = props.view;
        this._services = props.services;

        this._unsubscribeMethod = this._services.inspectionTransport!.subscribe(
            this._handleTransportMessage.bind(this)
        );
    }

    private _handleTransportMessage({ message, code }: { message: string; code: string | undefined | null }) {
        if (code) this._transportError = new TransportError({ message, code });
        if (!this._transportError && this._transportAwaitedResponse && message.includes(this._transportAwaitedResponse))
            this._transportAwaitedResponse = undefined;
    }

    public async run() {
        try {
            const track = this._model.videoSource.videoTrack;
            track!.checkThatTrackIsEnabled();
            track!.checkThatTrackIsExist();
            track!.checkThatTrackIsLive();

            await this._runMotionControl();
        } catch (err) {
            let error = err;
            if (err instanceof TransportError && err.code === '1120003') error = new InvalidVideoDataError();
            throw error;
        }
    }

    private _renderFaceBorder() {
        const { logger } = this._services;
        logger?.addDebugLog('Rendering face border has been start');

        const bbox = getScaledBbox(
            this._model.initialPosition.position!.bbox!,
            this._model.initialPosition.scalingCoefficient
        );

        const { width: previewWidth, height: previewHeight } = this._view.cameraPreview.getPreviewResolution();

        const { normalizationCalculator } = this._services;
        const offset = normalizationCalculator!.coordinatesOffset;
        const normalizationCoefficients = normalizationCalculator!.normalizationCoefficients;

        const bboxCenter = {
            x: (bbox.xMin + bbox.width / 2) * normalizationCoefficients.x - offset.x,
            y: (bbox.yMin + bbox.height / 2) * normalizationCoefficients.y - offset.y,
        };

        const bboxResolution = {
            width: bbox.width * normalizationCoefficients.x,
            height: bbox.height * normalizationCoefficients.y,
        };

        this._view.faceBorder.setResolution(previewWidth, previewHeight);

        this._view.renderFaceBorder();
        this._view.faceBorder.draw(bboxCenter, bboxResolution);
        logger?.addDebugLog('Rendering face border has been finished');
    }

    private async _runMotionControl() {
        const { customEventsListeners, inspectionTransport, logger } = this._services;

        let motionControlInspections: MotionControl | undefined;
        try {
            customEventsListeners!.addListener(Events.MOTION_CONTROL_ACTION, this._handleChangeCurrentAction);
            customEventsListeners!.addListener(
                Events.MOTION_CONTROL_FACE_POSITION_VALIDATION,
                this._handleCurrentValidationActionScore
            );

            this._motionControlVideoRecoder = await motionControlRecoderFactory({
                model: this._model,
                services: this._services,
                fn: ((data: Uint8Array<ArrayBuffer>) => {
                    if (this._transportError) return;

                    if (!inspectionTransport!.isOpenConnection) {
                        logger?.addWarningLog(`Trying send binary data failed because connection has been closed`);
                        return;
                    }

                    if (inspectionTransport! instanceof InspectionsWebSocketTransport) {
                        inspectionTransport!.sendMessage(data);
                    }
                }).bind(this),
            });

            const motionControlInspections = motionControlFactory({
                model: this._model,
                services: this._services,
                onStartCallback: this._onBeforeMotionControlCallback.bind(this),
                onFailedCallback: this._onFailedMotionControlCallback.bind(this),
                onFinishCallback: this._onFinishMotionControlCallback.bind(this),
            });

            logger?.addDebugLog(`Motion Control inspection had been started`);
            const result = await motionControlInspections.run();
            logger?.addDebugLog(`Motion Control inspection result: ${serializeObject(result)}`);
            this._model.motionControlMeta.result = result;

            await this._saveMotionControlResult(result);

            const { patternSettings } = this._model.motionControl;
            const { enableSaveFrames } = patternSettings;
            if (enableSaveFrames) await this._saveMotionControlActionsFrames(this._actionsFrames);

            const startAwaitResponseFn = this._createAwaitResponseFn('Save successfully performed');
            logger?.addDebugLog('Sending save signal has been started');
            inspectionTransport!.sendSaveRecordSignal();
            logger?.addDebugLog('Sending save signal has been finished');
            await startAwaitResponseFn();
        } catch (err) {
            throw err;
        } finally {
            customEventsListeners!.removeListener(Events.MOTION_CONTROL_ACTION, this._handleChangeCurrentAction);
            customEventsListeners!.removeListener(
                Events.MOTION_CONTROL_FACE_POSITION_VALIDATION,
                this._handleCurrentValidationActionScore
            );
            motionControlInspections?.destroy();
        }
    }

    private async _onBeforeMotionControlCallback() {
        const { processingVideoStream, uuidGenerator, logger } = this._services;
        const { motionControl } = this._model;

        this._view.renderFaceKeypointMask();
        this._view.renderFaceBorder();
        this._view.renderDirectionHints();

        const videoId = uuidGenerator!.generateUuid4();
        processingVideoStream!.setVideoId(videoId);
        logger?.addDebugLog(`Video UUDI4: ${videoId}`);

        await this._sendStartRecodingSignal(videoId);
        await timer(motionControl.timer.beforeStart);

        logger?.addDebugLog('Starting recoding video on frontend has been started');
        this._motionControlVideoRecoder.startRecoding(videoId);

        this._startCollectionBestshots();
    }

    private async _sendStartRecodingSignal(videoId: string) {
        const { inspectionTransport } = this._services;
        const { clientServerConnectionSettings, motionControl } = this._model;

        const type = Inspection.MOTION_CONTROL;
        const bitrate = clientServerConnectionSettings.videoBitrate;
        const params = {
            record_mc_reference_frames: motionControl.patternSettings.enableSaveFrames,
        };

        const settings = this._model.videoSource.videoTrack!.settings;
        if (!settings?.frameRate) throw new CameraFpsNotDefinedError();
        if (!settings?.width || !settings?.height) throw new VideoStreamResolutionIsUndefinedError();
        const { width, height, frameRate } = settings;

        const modeType = this._motionControlVideoRecoder instanceof MotionControlPacketsRecoder ? 'packets' : 'chunks';
        inspectionTransport!.sendMessage(modeType);

        const startAwaitResponseFn = this._createAwaitResponseFn('Transferring permitted');
        inspectionTransport!.sendStartRecordSignal({
            type,
            bitrate,
            params,
            videoId,
            codec: this._motionControlVideoRecoder.codec!,
            container: this._motionControlVideoRecoder.container!,
            fps: Math.floor(frameRate),
            pixel_format: 'yuv420p',
            resoulution: {
                width,
                height,
            },
        });
        await startAwaitResponseFn();
    }

    private async _onFailedMotionControlCallback() {
        const { localizator, inspectionTransport, logger } = this._services;

        logger?.addDebugLog('Reseting state Motion Control has been started');

        const message = localizator!.getLocalizedMessageByKey(
            'Stages.BiomertricalChecks.MotionControl.TextHints.AttemptFailed'
        );
        this._view.textHints?.setText(message);

        this._view.faceKeypointMask.removeFromDom();
        this._view.faceKeypointMask.clear();

        this._view.directionGifHint.removeFromDom();

        this._view.directionArrowHint.removeFromDom();
        this._view.directionArrowHint.clear();

        this._view.faceBorder.removeFromDom();
        this._view.faceBorder.clear();

        this._stopCollectionBestshots();

        logger?.addDebugLog('Reseting collected bestshots');
        this._model.bestshots.collection = [];

        logger?.addDebugLog('Reseting Motion Control actions frames');
        this._actionsFrames = [];

        logger?.addDebugLog('Stopping recoding Motion Control has been started');
        await this._motionControlVideoRecoder.resetRecoding();

        const startAwaitResponseFn = this._createAwaitResponseFn('Video record abort by component');
        inspectionTransport!.sendResetRecordSignal();
        await startAwaitResponseFn();

        logger?.addDebugLog('Reseting state Motion Control has been finished');

        await timer(1000);
    }

    private async _onFinishMotionControlCallback() {
        const { inspectionTransport, logger } = this._services;

        logger?.addDebugLog('Handing finish of Motion Control has been started');

        this._stopCollectionBestshots();

        this._view.directionArrowHint.removeFromDom();
        this._view.directionGifHint.removeFromDom();
        this._view.faceBorder.removeFromDom();
        this._renderSendindDataToServerHintMessage();

        logger?.addDebugLog('Stopping recoding Motion Control has been started');
        await this._motionControlVideoRecoder.stopRecoding();

        inspectionTransport!.sendStopRecordSignal();

        logger?.addDebugLog('Handing finish of Motion Control has been finished');
    }

    private _handleMotionControlActionEvent(event: Event) {
        const { logger } = this._services;

        logger?.addDebugLog('Handling Motion Control command has been started');
        // @ts-ignore
        const { command } = event.detail;
        logger?.addDebugLog(`Motion Control command: ${command}`);

        this._updateTextHintByMotionControlAction(command);
        this._updateFaceBorderMotionControlAction(command);
        this._updateDirectionArrowHintByMotionControlAction(command, 0);
        this._updateImageDirectionHint(command);

        logger?.addDebugLog('Handling Motion Control command has been finished');
    }

    private _updateTextHintByMotionControlAction(command: MotionControlActions | 'return') {
        const localizationService = this._services.localizator!;
        const localeKeyMapping: { [key: string]: string } = {
            left: 'TurnLeft',
            right: 'TurnRight',
            up: 'TurnUp',
            center: 'LookAtCenter',
            closer: 'Closer',
            farther: 'Farther',
            return: 'Normal',
        };

        const key = `Stages.BiomertricalChecks.MotionControl.TextHints.Command.${localeKeyMapping[command]}`;
        const message = localizationService.getLocalizedMessageByKey(key);
        this._view.textHints?.setText(message);
    }

    private _updateFaceBorderMotionControlAction(command: MotionControlActions | 'return') {
        const { logger } = this._services;
        const { patternCoefficients } = this._model.motionControl.faceBorder;
        let coefficient = 1;

        logger?.addDebugLog(`Updating face border by curent Motion Control command has been started`);

        if (command === 'closer') coefficient = patternCoefficients.closer;
        if (command === 'farther') coefficient = patternCoefficients.farther;

        logger?.addDebugLog(`Initial face scaling coefficient: ${coefficient}`);
        this._model.initialPosition.scalingCoefficient = coefficient;

        this._view.faceBorder.removeFromDom();
        this._view.resetHighlightFaceBorder();
        this._renderFaceBorder();

        logger?.addDebugLog(`Updating face border by curent Motion Control command has been finished`);
    }

    private _updateDirectionArrowHintByMotionControlAction(command: MotionControlActions | 'return', progress = 0) {
        const { initialPosition } = this._model;
        const bbox = getScaledBbox(initialPosition.position!.bbox, initialPosition.scalingCoefficient);

        const { normalizationCalculator } = this._services;
        const offset = normalizationCalculator!.coordinatesOffset;
        const normalizationCoefficients = normalizationCalculator!.normalizationCoefficients;

        this._view.directionArrowHint.clear();
        this._view.directionArrowHint.draw(
            {
                width: bbox.width * normalizationCoefficients.x,
                height: bbox.height * normalizationCoefficients.y,
                xMin: bbox.xMin * normalizationCoefficients.x - offset.x,
                xMax: bbox.xMax * normalizationCoefficients.x - offset.x,
                yMin: bbox.yMin * normalizationCoefficients.y - offset.y,
                yMax: bbox.yMax * normalizationCoefficients.y - offset.y,
            },
            command,
            progress
        );
    }

    private _updateImageDirectionHint(command: MotionControlActions | 'return') {
        const { enabled } = this._model.motionControl.imagesHints;
        if (!enabled) return;

        if (!this._view.directionGifHint.isLoaded)
            this._view.directionGifHint.init(this._model.motionControl.imagesHints.resourcesPath);

        this._view.directionGifHint.removeFromDom();
        this._view.relativeContainer.root.append(this._view.directionGifHint[command]);
    }

    private _handleCurrentValidationActionScoreEvent(event: Event) {
        const { motionControl } = this._model;
        const { enableSaveFrames } = motionControl.patternSettings;

        // @ts-ignore
        const { frame, isValid, score, message, command } = event.detail as ValidationResult & {
            frame: ImageBitmap;
            command: MotionControlActions | 'return';
        };

        if (message === 'Last failed image') {
            if (command !== 'return' && enableSaveFrames) this._actionsFrames.push(frame);
            return;
        }

        if (isValid) {
            this._view.highlightFaceBorder('success');
            if (command !== 'return' && enableSaveFrames) this._actionsFrames.push(frame);
            this._renderFaceBorder();
        }

        if (message) {
            const localizedMessage = this._services.localizator!.getLocalizedMessageByKey(
                `Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.${message}`
            );
            this._view.textHints?.setText(localizedMessage);
        } else {
            this._updateTextHintByMotionControlAction(command);
        }

        this._updateDirectionArrowHintByMotionControlAction(command, score);
    }

    private _renderSendindDataToServerHintMessage() {
        const message = this._services.localizator!.getLocalizedMessageByKey(
            'Stages.BiomertricalChecks.MotionControl.TextHints.SendingDataToServer'
        );
        this._view.textHints?.setText(message);
    }

    private async _saveMotionControlResult(result: MotionControlPatternResult) {
        const { logger, inspectionTransport } = this._services;
        logger?.addDebugLog(`Saving Motion Control inspection result had been started`);

        const jsonString = JSON.stringify({ type: RequestMessageType.DATA, body: result });

        let message = `Motion control video recorded`;
        if (this._model.motionControl.patternSettings.enableSaveFrames) message = `Transferring permitted`;

        const startAwaitResponseFn = this._createAwaitResponseFn(message);
        inspectionTransport!.sendMessage(jsonString);
        await startAwaitResponseFn();
        logger?.addDebugLog(`Saving Motion Control inspection result had been finished`);
    }

    private async _saveMotionControlActionsFrames(frames: ImageBitmap[]) {
        const { logger, inspectionTransport } = this._services;
        const { referenceFrameQuality } = this._model.clientServerConnectionSettings;

        logger?.addDebugLog('Sending frames to server has been started');
        for await (const frame of frames) {
            const arrayBuffer = await convertImageBitmapToArrayBuffer(frame, referenceFrameQuality);
            inspectionTransport!.sendMessage(arrayBuffer);
        }

        logger?.addDebugLog('Sending frames to server has been finished');
        const startAwaitResponseFn = this._createAwaitResponseFn('Motion control frames recorded');
        inspectionTransport!.sendStopRecordSignal();
        await startAwaitResponseFn();

        logger?.addDebugLog('Saving Motion Control actions frames has been finished');
    }

    private _startCollectionBestshots() {
        const { customEventsListeners, logger } = this._services;
        logger?.addDebugLog('Starting collect bestshots');
        customEventsListeners?.addListener(Events.DETECTOR_PROCESSED_FRAME, this._handleBestshots);
    }

    private _handleBesthotsEvents(event: Event) {
        const { faceRotationService } = this._services;
        const { initialPosition } = this._model;
        const { faceModelSettings, clientServerConnectionSettings } = this._model;

        const limit = clientServerConnectionSettings.requiredReferenceFrameCount;
        if (this._model.bestshots.collection.length >= limit) return;

        const data = (event as CustomEvent).detail as FaceDetectionResult & RawVideoFrame;
        if (!data.bbox || !data.keypoints || !data.image) return;

        const verticalNormalizationAngle = -initialPosition.position!.rotation.angles.pitch!;
        const { angles, currentHorizontalRotation, currentVerticalRotation } =
            faceRotationService!.defineRotationAnglesBy3dKeypoints(
                faceModelSettings.angleCalculation,
                data.keypoints,
                verticalNormalizationAngle
            );

        const isCenter = currentHorizontalRotation === 'center' && currentVerticalRotation === 'center';
        if (!isCenter) return;

        this._model.bestshots.collection.push({
            ...data,
            angles,
            currentHorizontalRotation,
            currentVerticalRotation,
        });
    }

    private _stopCollectionBestshots() {
        const { customEventsListeners, logger } = this._services;
        logger?.addDebugLog('Stopping collecting bestshots');
        customEventsListeners?.removeListener(Events.DETECTOR_PROCESSED_FRAME, this._handleBestshots);
    }

    private _createAwaitResponseFn(message: string) {
        const { logger } = this._services;
        this._transportAwaitedResponse = message;

        return async () => {
            logger?.addDebugLog(`Waiting "${message}" answer from server has been started`);
            await intervalCheckWithTimeout(
                () => {
                    if (this._transportError) throw this._transportError;
                    return !this._transportAwaitedResponse;
                },
                () => {
                    throw new TransmissionTimeoutError();
                },
                this._model.clientServerConnectionSettings.transmissionWaitTimeout
            );
            logger?.addDebugLog(`Answer "${message}" has been recieved from server`);
        };
    }
    public destroy() {
        this._stopCollectionBestshots();
        this._unsubscribeMethod();
        this._actionsFrames = [];
    }
}
