import { Events, FaceDetectionResult, intervalCheck, RawVideoFrame } from '../../../../shared';
import IdentifyFacePositionStage from '../../class';

export class IdentifyDynamicFacePositionStage extends IdentifyFacePositionStage {
    private _frameCounter = 0;

    public async tryIdentifyInitialFacePosition() {
        let handleDetectionEvent = this._handleDetectionEventForIdentifyInitialFacePosition.bind(this);
        try {
            this._services.customEventsListeners!.addListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            this._model.initialPosition.position = undefined;
            this._model.initialPosition.scalingCoefficient = 1;
            await intervalCheck(() => !!this._model.initialPosition.position);
        } catch (err) {
            throw err;
        } finally {
            this._services.customEventsListeners!.removeListener(Events.DETECTOR_PROCESSED_FRAME, handleDetectionEvent);
            handleDetectionEvent = undefined!;
        }
    }

    private async _handleDetectionEventForIdentifyInitialFacePosition(event: Event) {
        const { faceRotationService } = this._services;

        const detectionResult = (event as CustomEvent).detail as FaceDetectionResult & RawVideoFrame;
        const rotation = faceRotationService!.defineRotationAnglesBy3dKeypoints(
            this._model.faceModelSettings.angleCalculation,
            detectionResult.keypoints ?? []
        );

        const { width, height } = detectionResult.image;
        const { min, max } = this._faceBorder.autodetected.faceSize;

        try {
            this.throwErrorIfNoDetectedFace(detectionResult.bbox, detectionResult.keypoints);
            this.throwErrorIfDetectedFaceTooSmall(detectionResult.bbox!, min);
            this.throwErrorIfDetectedFaceTooBig(detectionResult.bbox!, max);
            this.throwErrorIfDetectedFaceOffscreen(detectionResult.bbox!, { width: width!, height: height! });
            this.throwErrorIfDetectedFaceHasInvalidRotationAngle(rotation);

            this._model.initialPosition.position = {
                bbox: detectionResult.bbox!,
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

        const { min, max } = this._faceBorder.autodetected.faceSize;

        try {
            this.throwErrorIfNoDetectedFace(detectionResult.bbox, detectionResult.keypoints);
            this.throwErrorIfDetectedFaceTooSmall(detectionResult.bbox!, min);
            this.throwErrorIfDetectedFaceTooBig(detectionResult.bbox!, max);
            this.throwErrorIfDetectedFaceHasInvalidRotationAngle(rotation);
            this.throwErrorIfHasKeypointsDeviationForNewDetectedFace(
                detectionResult.bbox!,
                this._model.initialPosition.position!.bbox
            );
            this._frameCounter += 1;

            const progress = this._calculateProgress();
            this._handleProgressMessage(progress);
        } catch (err) {
            this._frameCounter = 0;
            this._model.initialPosition.position = undefined;
            this._handleErrorMessage((err as Error).message);
        }
    }

    private _calculateProgress() {
        return this._frameCounter / this._faceBorder.autodetected.frameCheckLimit;
    }
}
