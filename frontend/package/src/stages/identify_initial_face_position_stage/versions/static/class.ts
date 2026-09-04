import { Events, FaceDetectionResult, intervalCheck, Resolution } from '../../../../shared';
import IdentifyFacePositionStage from '../../class';

export default class IdentifyStaticFacePosition extends IdentifyFacePositionStage {
    private _frameCounter = 0;

    public async tryIdentifyInitialFacePosition() {
        const { customEventsListeners } = this._services;
        let handleDetectionEvent = this._handleDetectionEventForIdentifyInitialFacePosition.bind(this);

        try {
            customEventsListeners!.addListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            this._model.initialPosition.position = undefined;
            await intervalCheck(() => !!this._model.initialPosition.position);
        } catch (err) {
            throw err;
        } finally {
            customEventsListeners!.removeListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            handleDetectionEvent = undefined!;
        }
    }

    private async _handleDetectionEventForIdentifyInitialFacePosition(event: Event) {
        const detectionResult = (event as CustomEvent).detail as FaceDetectionResult;

        const rotation = this._services.faceRotationService!.defineRotationAnglesBy3dKeypoints(
            this._model.faceModelSettings.angleCalculation,
            detectionResult.keypoints ?? []
        );

        try {
            this._model.initialPosition.position = {
                bbox: this._getFaceBboxByCameraResolution(),
                rotation,
            };
        } catch (err) {
            this._model.initialPosition.position = undefined;
            this._handleErrorMessage((err as Error).message);
        }
    }

    public async tryValidateInitialFacePosition() {
        let handleDetectionEvent = this._handleDetectionEventForValidatePosition.bind(this);
        try {
            this._services.customEventsListeners!.addListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            await intervalCheck(() => !this._model.initialPosition.position || this._calculateProgress() >= 1);
        } catch (err) {
            throw err;
        } finally {
            this._services.customEventsListeners!.removeListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            handleDetectionEvent = undefined!;
        }
    }

    private async _handleDetectionEventForValidatePosition(event: Event) {
        if (!this._model.initialPosition.position) return;
        const detectionResult = (event as CustomEvent).detail as FaceDetectionResult;

        const rotation = this._services.faceRotationService!.defineRotationAnglesBy3dKeypoints(
            this._model.faceModelSettings.angleCalculation,
            detectionResult.keypoints ?? []
        );

        const { bbox } = this._model.initialPosition.position;
        const { x, y } = this._faceBorder.allowableAccuracyError;

        const min: Resolution = {
            width: bbox.width - (bbox.width / 100) * x,
            height: bbox.height - (bbox.height / 100) * y,
        };

        const max: Resolution = {
            width: bbox.width + (bbox.width / 100) * x,
            height: bbox.height + (bbox.height / 100) * y,
        };

        try {
            this.throwErrorIfNoDetectedFace(detectionResult.bbox, detectionResult.keypoints);
            this.throwErrorIfDetectedFaceTooSmall(detectionResult.bbox!, min);
            this.throwErrorIfDetectedFaceTooBig(detectionResult.bbox!, max);
            this.throwErrorIfDetectedFaceHasInvalidRotationAngle(rotation);
            this.throwErrorIfDetectedFaceOutsideFaceBorder(
                detectionResult.bbox!,
                this._model.initialPosition.position!.bbox
            );
            this._frameCounter += 1;

            const progress = this._calculateProgress();
            this._handleProgressMessage(progress);
            this._model.initialPosition.position!.rotation = rotation;
        } catch (err) {
            this._frameCounter = 0;
            this._handleErrorMessage((err as Error).message);
        }
    }

    private _calculateProgress() {
        return this._frameCounter / this._faceBorder.autodetected.frameCheckLimit;
    }
}
