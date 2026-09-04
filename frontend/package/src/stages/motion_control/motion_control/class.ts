import {
    Events,
    FaceDetectorSettingsBlock,
    MotionControlActions,
    MotionControlPatternResult,
    MotionControlSettingsBlock,
    onMotionCallback,
    serializeObject,
    timer,
} from '../../../shared';
import { MotionControlFacePositionValidator } from '../motion_control_face_position_validator';
import { MotionControlPatternCreator, motionControlPatternCreatorFactory } from '../motion_control_pattern_creator';

import { FlowInitialPositionMeta } from '../../../application';
import { Services } from '../../../modes/_core';

type Model = {
    initialPosition: FlowInitialPositionMeta;
} & { onMotion?: onMotionCallback } & MotionControlSettingsBlock &
    FaceDetectorSettingsBlock;

export type Props = {
    model: Model;
    services: Services;
    onStartCallback?: () => void;
    onFinishCallback?: () => void;
    onFailedCallback?: () => void;
};

export default class MotionControl {
    private _model: Model;
    private _services: Services;

    private _onStartCallback?: () => void;
    private _onFinishCallback?: () => void;
    private _onFailedCallback?: () => void;

    private _attemptNumber = 0;
    private _result: MotionControlPatternResult = [];
    private _patternCreator: MotionControlPatternCreator;
    private _facePositionValidator: MotionControlFacePositionValidator;

    constructor(props: Props) {
        this._model = props.model;
        this._services = props.services;
        this._onStartCallback = props.onStartCallback;

        this._onFinishCallback = props.onFinishCallback;
        this._onFailedCallback = props.onFailedCallback;

        this._patternCreator = motionControlPatternCreatorFactory(this._model.motionControl.patternSettings);

        this._facePositionValidator = new MotionControlFacePositionValidator({
            model: this._model,
            services: this._services,
        });
    }

    public async run() {
        const { logger } = this._services;
        const { attemptsCount } = this._model.motionControl;

        while (this._attemptNumber < attemptsCount) {
            try {
                this._patternCreator.createPattern();
                this._patternCreator.throwErrorIfPatternNotExist();
                const pattern = this._patternCreator.currentPattern!;
                logger?.addDebugLog(`Motion Control pattern: ${serializeObject(pattern)}`);

                await this._callOnStartCallbackIfExist();
                await this._runHandleMotionControlPattern(pattern!);

                await this._callOnFinishCallbackIfExist();
                return this._result;
            } catch (err) {
                logger?.addWarningLog(`Motion Control failed`);
                if ((err as Error).name !== 'FailedMotionControlActionError') throw err;
                if (this._attemptNumber < attemptsCount) await this._callOnFaliedCallbackIfExist();
            }
        }

        await this._callOnFinishCallbackIfExist();
        return this._result;
    }

    private async _callOnStartCallbackIfExist() {
        if (this._onStartCallback) await this._onStartCallback();
    }

    private async _runHandleMotionControlPattern(pattern: MotionControlActions[]) {
        this._result = [];

        for (let index = 0; index < pattern.length; index += 1) {
            const command = pattern[index];
            this._callOnMotionCallback(command);

            try {
                this._generateHandleMotionControlActionEvent(command);
                await this._facePositionValidator.validateFacePositionForCommand(command);
                this._result.push({ pattern: command, result: true });
                this._callOnMotionCallback(command, true);

                this._callOnMotionCallback('return');
                this._generateHandleMotionControlActionEvent('return');
                const result = await this._facePositionValidator.validateFacePositionForCommand('return', false);
                this._callOnMotionCallback('return', result);
            } catch (err) {
                this._result.push({ pattern: command, result: false });
                this._callOnMotionCallback(command, false);

                if ((err as Error).name === 'FailedMotionControlActionError') {
                    this._generateFailedMotionControlEvent();
                    this._attemptNumber += 1;
                    await timer(1000);
                }

                throw err;
            }
        }
    }

    private _generateHandleMotionControlActionEvent(command: MotionControlActions | 'return') {
        const event = new CustomEvent(Events.MOTION_CONTROL_ACTION, {
            detail: {
                command,
            },
        });
        window.dispatchEvent(event);
    }

    private _callOnMotionCallback(command: MotionControlActions | 'return', result?: boolean) {
        const { logger } = this._services;
        if (result !== undefined) logger?.addDebugLog(`Motion Control Command: ${command}, verdict: ${result}`);

        const callback = this._model.onMotion;
        if (callback && typeof callback === 'function') {
            logger?.addDebugLog('onMotion callback calling');
            callback(command, this._attemptNumber, result);
        }
    }

    private _generateFailedMotionControlEvent() {
        const event = new CustomEvent(Events.FAILED_MOTION_CONTROL);
        window.dispatchEvent(event);
    }

    private async _callOnFinishCallbackIfExist() {
        if (this._onFinishCallback) await this._onFinishCallback();
    }

    private async _callOnFaliedCallbackIfExist() {
        if (this._onFailedCallback) await this._onFailedCallback();
    }

    public destroy() {}
}
