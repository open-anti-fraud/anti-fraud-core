import { Services, View } from '../../modes/_core';
import { Stage, StageDescriptionSettings } from '../../shared';

export type Props = {
    view: View;
    model: StageDescriptionSettings;
    services: Services;
};

export default class DescriptionStage implements Stage {
    name = 'DescriptionStage';

    private _view: View;
    private _model: StageDescriptionSettings;
    private _services: Services;

    constructor(props: Props) {
        this._model = props.model;
        this._services = props.services;
        this._view = props.view;
    }

    run(): Promise<string | Error> {
        const { localizator } = this._services;
        const key = `Stages.Initialization.Description`;

        const descriptionHeaderText = localizator?.getLocalizedMessageByKey(`${key}.MotionControl.Heading`);
        this._view.descriptionHeading.setText(descriptionHeaderText);
        this._view.contentLayout.header.append(this._view.descriptionHeading.root);

        const descriptionText = localizator?.getLocalizedMessageByKey(`${key}.MotionControl.Text`);
        this._view.descriptionText.setText(descriptionText);
        this._view.contentLayout.content.append(this._view.descriptionText.root);

        const continueButtonText = localizator?.getLocalizedMessageByKey(`${key}.ContinueButton`);
        this._view.continueButton.setText(continueButtonText);
        this._view.setFooter(this._view.continueButton.root);

        if (this._view.backButton) {
            const backButtonText = localizator?.getLocalizedMessageByKey(`${key}.BackButton`);
            this._view.backButton.setText(backButtonText);
            this._view.setFooter(this._view.backButton.root);
        }

        this._view.removePreloader();

        return new Promise((resolve, rejects) => {
            const { logger } = this._services;
            let timerId: NodeJS.Timeout | undefined;
            const autoSubmit = this._model.autoSubmit;

            if (autoSubmit.enabled)
                timerId = setTimeout(() => {
                    logger?.addDebugLog('Go next from description stage by timer');
                    resolve('ok');
                }, autoSubmit.timer);

            const stopTimer = () => {
                if (timerId) clearTimeout(timerId);
                timerId = undefined;
            };

            this._view.continueButton.setHandleClick(() => {
                logger?.addDebugLog('Continue button from description stage has been pressed');
                stopTimer();
                resolve('ok');
            });

            this._view.backButton?.setHandleClick(() => {
                logger?.addDebugLog('Back button from description stage has been pressed');
                stopTimer();
                rejects(new Error('Back'));
            });
        });
    }

    destroy() {
        this._view.descriptionHeading.destroy();
        this._view.descriptionText.destroy();
        this._view.continueButton.destroy();
        this._view.backButton?.destroy();
    }
}
