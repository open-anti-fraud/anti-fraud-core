import { FaceBestshot } from '../../../domain';
import {
    Events,
    FaceDetectionResult,
    FaceDetectorSettingsBlock,
    getScaledBbox,
    MotionControlActions,
    MotionControlSettingsBlock,
    RawVideoFrame,
    timer,
} from '../../../shared';

import { Services } from '../../../modes/_core';
import { FacePositionValidatorByCommandNotFoundError, FailedMotionControlActionError } from './error';
import { ValidationFunction, ValidationResult } from './types';
import { FlowInitialPositionMeta } from '../../../application';

type Model = { initialPosition: FlowInitialPositionMeta } & MotionControlSettingsBlock & FaceDetectorSettingsBlock;

export type Props = {
    model: Model;
    services: Services;
};

export default class MotionControlFacePositionValidator {
    private _model: Model;
    private _services: Services;

    private _timeoutId: NodeJS.Timeout | undefined;
    private _isRunning: boolean = false;
    private _currentFace: FaceBestshot;
    private _handleDetectedFaceEvent = this._handleDetectedFace.bind(this);
    private _lastErrorMessage: string | undefined;

    constructor(props: Props) {
        this._model = props.model;
        this._services = props.services;
    }

    public async validateFacePositionForCommand(command: MotionControlActions | 'return', throwError: boolean = true) {
        const { customEventsListeners } = this._services;
        try {
            customEventsListeners!.addListener(Events.DETECTOR_PROCESSED_FRAME, this._handleDetectedFaceEvent);
            return await this._runFaceValidationForCommand(command, throwError);
        } finally {
            customEventsListeners!.removeListener(Events.DETECTOR_PROCESSED_FRAME, this._handleDetectedFaceEvent);
            await timer(this._model.motionControl.timer.betweenCommand);
        }
    }

    private _handleDetectedFace(event: Event) {
        const detectionResult = (event as CustomEvent).detail as FaceDetectionResult & RawVideoFrame;
        if (!detectionResult?.image) return;

        const faceRotationService = this._services.faceRotationService!;
        const verticalNormalizationAngle = this._calculateVerticalNormalizationAngle();
        const angles = faceRotationService.defineRotationAnglesBy3dKeypoints(
            this._model.faceModelSettings.angleCalculation,
            detectionResult?.keypoints ?? [],
            verticalNormalizationAngle
        );

        this._currentFace = {
            ...detectionResult,
            ...angles,
        };
    }

    private _calculateVerticalNormalizationAngle() {
        const rotation = this._model.initialPosition.position?.rotation;
        if (!rotation) throw new Error('No initial face rotation data');
        return -rotation.angles.pitch!;
    }

    private async _runFaceValidationForCommand(command: MotionControlActions | 'return', throwError: boolean = true) {
        const { logger } = this._services;
        let testPassed = false;
        this._isRunning = true;

        try {
            logger?.addDebugLog(`Validation face during Motion Control has been stared`);
            testPassed = await Promise.race<boolean>([
                this._runCycleOfCheckingFacePositionForCommand(command),
                this._stopRunningCycleByTimeout(),
            ]);
            logger?.addDebugLog(`Validation face during Motion Control has been finished`);

            return testPassed;
        } catch (error) {
            console.error(error);
        } finally {
            this._stopCycle();

            if (!testPassed && throwError) {
                this._generateValidationEvent(this._currentFace?.image, {
                    command,
                    isValid: false,
                    score: 0,
                    message: 'Last failed image',
                });
                throw new FailedMotionControlActionError();
            }
        }
    }

    private async _runCycleOfCheckingFacePositionForCommand(command: MotionControlActions | 'return') {
        const { logger } = this._services;
        const validateFunction = this._getValidatorFunctionForCommand(command);

        this._lastErrorMessage = undefined!;

        while (this._isRunning) {
            await timer(this._model.motionControl.timer.checkFacePosition);
            const frame = this._currentFace?.image;

            let message;
            if (!this._hasDetectedFace()) {
                message = 'IDontSeeYou';
                this._generateValidationEvent(frame, {
                    command,
                    isValid: false,
                    score: 0,
                    message: 'IDontSeeYou',
                });
            } else {
                const facePositionResult = this._isValidFacePosition.apply(this);
                const isSizeCheckRequiredCommand =
                    command === MotionControlActions.CLOSER ||
                    command === MotionControlActions.FARTHER ||
                    command === 'return';
                const faceSizeResult = isSizeCheckRequiredCommand
                    ? this._isValidFaceSize.apply(this)
                    : ({ isValid: true, score: 100, message: undefined } as ValidationResult);
                const faceAngleResult = validateFunction.apply(this);
                this._generateValidationEvent(frame, {
                    command,
                    isValid: faceSizeResult.isValid && facePositionResult.isValid && faceAngleResult.isValid,
                    score: Math.min(faceAngleResult.score, faceSizeResult.score, facePositionResult.score),
                    message: faceSizeResult.message ?? facePositionResult.message ?? faceAngleResult.message,
                });

                const isValid = facePositionResult.isValid && faceSizeResult.isValid && faceAngleResult.isValid;
                if (isValid) return true;
                message = faceSizeResult.message ?? facePositionResult.message ?? 'Failed face angles';
            }

            if (message !== this._lastErrorMessage) {
                logger?.addDebugLog(`${message}`);
                this._lastErrorMessage = message;
            }
        }

        return false;
    }

    private _getValidatorFunctionForCommand(command: MotionControlActions | 'return'): ValidationFunction {
        switch (command) {
            case 'left':
                return this._checkAngleTurningHeadToLeft;
            case 'right':
                return this._checkAngleTurningHeadToRight;
            case 'up':
                return this._checkAngleTurningHeadToUp;
            case 'closer':
                return this._checkThatFaceNoRotated;
            case 'farther':
                return this._checkThatFaceNoRotated;
            case 'return':
                return this._checkThatFaceNoRotated;
            default:
                throw new FacePositionValidatorByCommandNotFoundError();
        }
    }

    private _generateValidationEvent(
        frame: ImageBitmap,
        validationResult: ValidationResult & { command: MotionControlActions | 'return' }
    ) {
        const event = new CustomEvent(Events.MOTION_CONTROL_FACE_POSITION_VALIDATION, {
            detail: { frame, ...validationResult },
        });
        window.dispatchEvent(event);
    }

    private _checkAngleTurningHeadToRight(): ValidationResult {
        const { right } = this._model.faceModelSettings.angleCalculation.angles;

        let maxAngle = Math.abs(right);
        maxAngle = maxAngle >= 90 ? 90 : maxAngle;

        let score = 0;
        if (this._currentFace.angles?.yaw !== undefined) {
            const yaw = this._currentFace.angles.yaw > 0 ? 0 : Math.abs(this._currentFace.angles.yaw);
            score = Math.min(1, yaw / maxAngle);
            score = Math.floor(score * 100);
        }

        return {
            score,
            isValid: this._currentFace.currentHorizontalRotation === 'right',
        };
    }

    private _checkAngleTurningHeadToLeft() {
        const { left } = this._model.faceModelSettings.angleCalculation.angles;

        let maxAngle = Math.abs(left);
        maxAngle = maxAngle >= 90 ? 90 : maxAngle;

        let score = 0;
        if (this._currentFace.angles.yaw !== undefined) {
            const yaw = this._currentFace.angles.yaw < 0 ? 0 : this._currentFace.angles.yaw;
            score = Math.min(1, yaw / maxAngle);
            score = Math.floor(score * 100);
        }

        return {
            score,
            isValid: this._currentFace.currentHorizontalRotation === 'left',
        };
    }

    private _checkAngleTurningHeadToUp() {
        const { up } = this._model.faceModelSettings.angleCalculation.angles;
        let maxAngle = Math.abs(up);
        maxAngle = maxAngle >= 90 ? 90 : maxAngle;

        let score = 0;
        if (this._currentFace.angles?.pitch !== undefined) {
            const pitch = this._currentFace.angles.pitch < 0 ? 0 : this._currentFace.angles.pitch;
            score = Math.min(1, pitch / maxAngle);
            score = Math.floor(score * 100);
        }

        return {
            score,
            isValid: this._currentFace.currentVerticalRotation === 'up',
        };
    }

    private _checkThatFaceNoRotated() {
        const isValidRotation =
            this._services.faceRotationValidator!.isHorizontalRotationCenter(this._currentFace) &&
            this._services.faceRotationValidator!.isVerticalRotationCenter(this._currentFace);

        return {
            score: isValidRotation ? 100 : 0,
            isValid: isValidRotation,
        };
    }

    private _isValidFaceSize() {
        if (!this._currentFace?.bbox || !this._currentFace?.normalizedKeypoints)
            return { isValid: false, message: 'IDontSeeYou', score: 0 };

        const allowableAccuracyError = this._model.motionControl.faceBorder.allowableAccuracyError;

        let message = undefined;

        const { width } = getScaledBbox(
            this._model.initialPosition.position!.bbox,
            this._model.initialPosition.scalingCoefficient
        );
        const idealWidth = width;
        const idealHeight = (idealWidth * 3) / 2;

        const faceWidthRatio = this._currentFace.bbox.width / idealWidth;
        const faceHeightRatio = this._currentFace.bbox.height / idealHeight;

        const xAllowableAccuracyError = allowableAccuracyError.x / 100;
        const yAllowableAccuracyError = allowableAccuracyError.y / 100;

        const isFaceWidthMoreOrEqualMinValue = 1 - xAllowableAccuracyError <= faceWidthRatio;
        const isFaceWidthLessOrEqualMaxValue = faceWidthRatio <= 1;

        const isFaceHeightMoreOrEqualMinValue = 1 - yAllowableAccuracyError <= faceHeightRatio;
        const isFaceHeightLessOrEqualMaxValue = faceHeightRatio <= 1;

        const isfaceWidthCorrect = isFaceWidthMoreOrEqualMinValue && isFaceWidthLessOrEqualMaxValue;
        const isFaceHeightCorrect = isFaceHeightMoreOrEqualMinValue && isFaceHeightLessOrEqualMaxValue;

        let xScore;
        if (!isFaceWidthMoreOrEqualMinValue) {
            message = 'LittleFace';
            xScore = faceWidthRatio / (1 - xAllowableAccuracyError);
        } else if (!isFaceWidthLessOrEqualMaxValue) {
            message = 'BigFace';
            xScore = 1 - Math.abs(1 - faceWidthRatio);
        }

        let yScore;
        if (!isFaceHeightMoreOrEqualMinValue) {
            message = 'LittleFace';
            yScore = faceHeightRatio / (1 - yAllowableAccuracyError);
        } else if (!isFaceHeightLessOrEqualMaxValue) {
            message = 'BigFace';
            yScore = 1 - Math.abs(1 - faceHeightRatio);
        }

        let score = 0;
        if (xScore && yScore) {
            score = (xScore > yScore ? yScore : xScore) * 100;
        } else if (xScore) {
            score = xScore * 100;
        } else if (yScore) {
            score = yScore * 100;
        } else {
            score = 100;
        }

        return { isValid: isfaceWidthCorrect && isFaceHeightCorrect, message, score };
    }

    private _isValidFacePosition() {
        if (!this._currentFace?.bbox || !this._currentFace?.normalizedKeypoints)
            return { isValid: false, message: 'IDontSeeYou', score: 0 };

        let message = undefined;

        const initialFacePosition = getScaledBbox(
            this._model.initialPosition.position!.bbox,
            this._model.initialPosition.scalingCoefficient
        );

        const allowableAccuracyError = this._model.motionControl.faceBorder.allowableAccuracyError;
        const xAllowableAccuracyError = initialFacePosition.width * (allowableAccuracyError.x / 100);
        const yAllowableAccuracyError = initialFacePosition.height * (allowableAccuracyError.y / 100);

        const isValid = this._services.facePositionValidator!.isSamePosition(
            this._currentFace.bbox,
            initialFacePosition,
            {
                x: xAllowableAccuracyError,
                y: yAllowableAccuracyError,
            }
        );

        if (!isValid) message = 'MoveFaceOnCenter';
        return { isValid, message, score: isValid ? 100 : 0 };
    }

    private _hasDetectedFace() {
        return this._currentFace && this._currentFace.bbox;
    }

    private _stopRunningCycleByTimeout() {
        const { logger } = this._services;
        const ms = this._model.motionControl.timer.cancelCheckCommand;
        return new Promise<boolean>((resolve) => {
            this._timeoutId = setTimeout(() => {
                logger?.addWarningLog('Motion Control attempt failed by timeout');
                resolve(false);
            }, ms);
        });
    }

    private _stopCycle() {
        if (this._isRunning) {
            this._isRunning = false;
        }

        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = undefined;
        }
    }
}
