import {
    BoundingBox,
    FaceBestshotSettingsBlock,
    FaceBorderSettings,
    FaceDetectorSettingsBlock,
    FaceRotation,
    getScaledBbox,
    InvalidVideoStreamResolutionValueError,
    MotionControlSettingsBlock,
    Point,
    Point3D,
    Resolution,
    serializeObject,
    Stage,
    timer,
} from '../../shared';

import { FlowInitialPositionMeta, FlowStageMeta, FlowVideoSourceMeta } from '../../application';
import { Services, View } from '../../modes/_core';

export type Props = {
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        initialPosition: FlowInitialPositionMeta;
    } & MotionControlSettingsBlock &
        FaceBestshotSettingsBlock &
        FaceDetectorSettingsBlock;
    view: View;
    services: Services;
    module: 'Motion Control' | 'Take Face Bestshot';
};

export default abstract class IdentifyFacePositionStage implements Stage {
    name = 'IdentifyFacePositionStage';

    protected _model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        initialPosition: FlowInitialPositionMeta;
    } & MotionControlSettingsBlock &
        FaceBestshotSettingsBlock &
        FaceDetectorSettingsBlock;
    protected _view: View;
    protected _services: Services;
    protected _module: 'Motion Control' | 'Take Face Bestshot';
    protected _faceBorder: FaceBorderSettings;

    protected abstract tryIdentifyInitialFacePosition(): void;
    protected abstract tryValidateInitialFacePosition(): void;

    private _lastError: string | undefined;

    private _startTime: number | undefined;
    private _debugLog: string | undefined;
    private _timerId: NodeJS.Timeout | undefined;

    constructor(props: Props) {
        this._module = props.module;
        this._model = props.model;
        this._services = props.services;
        this._view = props.view;

        const { motionControl, faceBestshotSettings } = this._model;
        this._faceBorder =
            this._module === 'Motion Control' ? motionControl.faceBorder : faceBestshotSettings.faceBorder;
    }

    async run() {
        const track = this._model.videoSource.videoTrack;
        track!.checkThatTrackIsEnabled();
        track!.checkThatTrackIsExist();
        track!.checkThatTrackIsLive();

        const { logger } = this._services;

        try {
            while (true) {
                logger?.addDebugLog('Identifying initial face position has been start');
                this._startTime = Date.now();
                this._debugLog = undefined;
                this._watch();

                await this.tryIdentifyInitialFacePosition();
                logger?.addDebugLog(`Initial face position: ${serializeObject(this._model.initialPosition.position)}`);

                this._renderFaceBorder();

                logger?.addDebugLog('Validating initial face position has been start');
                await this.tryValidateInitialFacePosition();
                logger?.addDebugLog('Validating initial face position has been finished');

                if (!this._model.initialPosition.position) {
                    logger?.addWarningLog(
                        'Validating initial face position has been failed. Identifying initial face position will be retry'
                    );
                    this._view.faceBorder.clear();
                    await timer(1000);
                    this._stopWatch();
                } else {
                    logger?.addDebugLog('Initial face position has been identified');
                    break;
                }
            }
        } catch (err) {
            throw err;
        }
    }

    private _renderFaceBorder() {
        const { logger } = this._services;
        logger?.addDebugLog('Rendering face border has been start');

        logger?.addDebugLog('Calculating scaled face has been start');
        const bbox = getScaledBbox(
            this._model.initialPosition.position!.bbox!,
            this._model.initialPosition.scalingCoefficient
        );
        logger?.addDebugLog('Calculating scaled face has been finished');
        logger?.addDebugLog(`Scaled bbox: ${serializeObject(bbox)}`);

        const { width: previewWidth, height: previewHeight } = this._view.cameraPreview.getPreviewResolution();

        const { normalizationCalculator } = this._services;
        const offset = normalizationCalculator!.coordinatesOffset;
        const normalizationCoefficients = normalizationCalculator!.normalizationCoefficients;

        logger?.addDebugLog('Calculating bbox center has been start');
        const bboxCenter = {
            x: (bbox.xMin + bbox.width / 2) * normalizationCoefficients.x - offset.x,
            y: (bbox.yMin + bbox.height / 2) * normalizationCoefficients.y - offset.y,
        };
        logger?.addDebugLog('Calculating bbox center been finished');
        logger?.addDebugLog(`Calculating bbox center: ${serializeObject(bboxCenter)}`);

        logger?.addDebugLog('Calculating bbox resolution has been start');
        const bboxResolution = {
            width: bbox.width * normalizationCoefficients.x,
            height: bbox.height * normalizationCoefficients.y,
        };
        logger?.addDebugLog('Calculating bbox resolution been finished');
        logger?.addDebugLog(`Calculating bbox resolution: ${serializeObject(bboxResolution)}`);

        logger?.addDebugLog('Setting resolution for face border has been start');
        this._view.faceBorder.setResolution(previewWidth, previewHeight);
        logger?.addDebugLog('Setting resolution for face border has been finished');

        this._view.renderFaceBorder();
        this._view.faceBorder.draw(bboxCenter, bboxResolution);
        logger?.addDebugLog('Rendering face border has been finished');
    }

    protected _handleProgressMessage(progress: number) {
        const { localizator } = this._services;

        let message;
        const progressInPercent = progress * 100;

        if (progressInPercent > 0 && progressInPercent < 100) {
            message = `${localizator?.getLocalizedMessageByKey(
                'Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.CheckPosition'
            )}: ${Math.ceil(progressInPercent)}%`;
        } else {
            message = localizator?.getLocalizedMessageByKey(
                'Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.DontMove'
            );
        }

        this._view.textHints.setText(message);
    }

    protected _handleErrorMessage(message: string) {
        const { localizator } = this._services;
        const locale = localizator?.getLocalizedMessageByKey(
            `Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.${message}`
        );
        this._logErrorEvent(message);
        this._view.textHints.setText(locale);
    }

    protected throwErrorIfNoDetectedFace(bbox: BoundingBox | undefined, keypoints: Point3D[] | undefined) {
        if (!bbox || !keypoints || keypoints.length === 0) {
            this._debugLog = `Has bbox: ${!!bbox}, has keypoint: ${!!keypoints}, keypoints length: ${
                keypoints?.length ?? 0
            }`;
            throw new Error('IDontSeeYou');
        }
    }

    protected throwErrorIfDetectedFaceTooSmall(bbox: BoundingBox, min: Resolution) {
        const { faceSizeValidator } = this._services;
        const isFaceToSmall = faceSizeValidator!.isTooSmall(bbox, min);
        if (isFaceToSmall) {
            this._debugLog = `Bbox: ${serializeObject(bbox)}, min size: ${serializeObject(min)}`;
            throw new Error('LittleFace');
        }
    }

    protected throwErrorIfDetectedFaceTooBig(bbox: BoundingBox, max: Resolution) {
        const { faceSizeValidator } = this._services;
        const isFaceTooBig = faceSizeValidator!.isTooBig(bbox, max);
        if (isFaceTooBig) {
            this._debugLog = `Bbox: ${serializeObject(bbox)}, max size: ${serializeObject(max)}`;
            throw new Error('BigFace');
        }
    }

    protected throwErrorIfDetectedFaceOffscreen(bbox: BoundingBox, streamResolution: Resolution) {
        const { facePositionValidator } = this._services;
        const { horizontal, vertical } = this._faceBorder.autodetected.framePadding;
        const isFaceOffscreen = facePositionValidator!.isOffscreen(bbox, streamResolution, {
            horizontal,
            vertical,
        });

        if (isFaceOffscreen) {
            this._debugLog = `Bbox: ${serializeObject(bbox)}, resolution ${serializeObject(streamResolution)}`;
            throw new Error('FaceOutsideFrame');
        }
    }

    protected throwErrorIfHasKeypointsDeviationForNewDetectedFace(bbox: BoundingBox, initialBbox: BoundingBox) {
        const availableDeviation = this._faceBorder.autodetected.availableDeviation ?? 25;

        const p1 = {
            x: bbox.xMin,
            y: bbox.yMin,
        };

        const p2 = {
            x: initialBbox.xMin,
            y: initialBbox.yMin,
        };

        const p3 = {
            x: bbox.xMax,
            y: bbox.yMax,
        };

        const p4 = {
            x: bbox.xMax,
            y: bbox.yMax,
        };

        const hasDeviation =
            this._calculatePointsDistance(p1, p2) > availableDeviation ||
            this._calculatePointsDistance(p3, p4) > availableDeviation;

        if (hasDeviation) {
            this._debugLog = `Bbox: ${serializeObject(bbox)}, initial bbox: ${serializeObject(initialBbox)}`;
            throw new Error('DontMove');
        }
    }

    protected _calculatePointsDistance(a: Point, b: Point) {
        const xDistance = Math.pow(b.x - a.x, 2);
        const yDistance = Math.pow(b.y - a.y, 2);
        return Math.sqrt(xDistance + yDistance);
    }

    protected throwErrorIfDetectedFaceOutsideFaceBorder(bbox: BoundingBox, initialFaceBbox: BoundingBox) {
        const { facePositionValidator } = this._services;
        const { x, y } = this._faceBorder.allowableAccuracyError;
        const allowableAccuracyError = {
            x: (bbox.width * (x / 100)) / 2,
            y: (bbox.height * (y / 100)) / 2,
        };

        const isSamePosition = facePositionValidator!.isSamePosition(bbox, initialFaceBbox, allowableAccuracyError);
        if (!isSamePosition) {
            this._debugLog = `Bbox: ${serializeObject(bbox)}, initial bbox: ${serializeObject(initialFaceBbox)}`;
            throw new Error('MoveFaceOnCenter');
        }
    }

    protected throwErrorIfDetectedFaceHasInvalidRotationAngle(rotation: FaceRotation) {
        const { faceRotationValidator } = this._services;
        const isInvalidRotationAngle = faceRotationValidator!.isHorizontalRotationCenter(rotation);
        if (!isInvalidRotationAngle) {
            this._debugLog = `Rotation: ${serializeObject(rotation)}`;
            throw new Error('LookAtCamera');
        }
    }

    protected _getFaceBboxByCameraResolution() {
        let faceWidthCoefficient = 0;
        const { width: streamWidth, height: streamHeight } = this._model.videoSource.videoTrack!.settings;
        if (!streamWidth || !streamHeight) throw new InvalidVideoStreamResolutionValueError();

        const isAppleMobile = this._services.device?.isAppleMobile();
        const width = isAppleMobile ? Math.min(streamHeight, streamWidth) : streamWidth;
        const height = isAppleMobile ? Math.max(streamHeight, streamWidth) : streamHeight;

        const { faceWidthCoefficients } = this._faceBorder;
        if (width >= 1920) {
            faceWidthCoefficient = faceWidthCoefficients.fullHd;
        } else if (width >= 1280 && width < 1920) {
            faceWidthCoefficient = faceWidthCoefficients.hd;
        } else {
            faceWidthCoefficient = faceWidthCoefficients.sd;
        }

        const faceWidth = (width / 100) * faceWidthCoefficient;
        const faceHeight = (faceWidth * 3) / 2;

        return {
            width: faceWidth,
            height: faceHeight,
            xMin: width / 2 - faceWidth / 2,
            yMin: height / 2 - faceHeight / 2,
            xMax: width / 2 + faceWidth / 2,
            yMax: height / 2 + faceHeight / 2,
        } as BoundingBox;
    }

    private _watch() {
        if (!this._startTime) return;

        const now = Date.now();
        const timeDiff = now - this._startTime;

        if (timeDiff > 30_000) return;

        if (timeDiff > 5_000 && this._debugLog) {
            const { logger } = this._services;
            logger?.addDebugLog(this._debugLog);
        }

        this._timerId = setTimeout(this._watch.bind(this), 5000);
    }

    private _stopWatch() {
        if (this._timerId) {
            clearTimeout(this._timerId);
            this._timerId = undefined;
        }
    }

    private _logErrorEvent(message: string) {
        const { logger } = this._services;
        if (this._lastError !== message) {
            logger?.addDebugLog(message);
            this._lastError = message;
        }
    }

    public destroy() {
        this._stopWatch();
        this._startTime = undefined;
        this._lastError = undefined;
    }
}
