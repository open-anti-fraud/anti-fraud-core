import { timer } from '../../../../shared';
import IdentifyFacePositionStage from '../../class';

export default class IdentifyFacePositionWithoutDetector extends IdentifyFacePositionStage {
    public async tryIdentifyInitialFacePosition() {
        this._model.initialPosition.position = {
            bbox: this._getFaceBboxByCameraResolution(),
            rotation: {
                currentHorizontalRotation: 'center',
                currentVerticalRotation: 'center',
                angles: {
                    pitch: 0,
                    yaw: 0,
                    roll: 0,
                },
            },
        };
    }

    public async tryValidateInitialFacePosition() {
        const { logger, localizator } = this._services;
        let locale;

        for (let i = Math.floor(this._model.faceModelSettings.timeToStartRecord / 1000); i > 0; i -= 1) {
            logger?.addDebugLog(`Time before run: ${i * 1000} ms`);
            locale = `${localizator?.getLocalizedMessageByKey(
                `Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.TimerBeforeRun`
            )} ${i}`;
            this._view.textHints.setText(locale);
            await timer(1000);
        }

        locale = localizator?.getLocalizedMessageByKey(
            `Stages.BiomertricalChecks.IdentifyFacePosition.TextHints.DontMove`
        );
        logger?.addDebugLog(locale ?? '');
        this._view.textHints.setText(locale);
    }
}
