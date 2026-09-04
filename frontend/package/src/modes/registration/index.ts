import { ComponentSettingsFromClient } from '../../application';
import { WebComponent } from '../_core';

export default class TDVRegistrationOnboarding extends WebComponent {
    constructor(configurationFromClient: ComponentSettingsFromClient) {
        super({
            mode: 'registration',
            configurationFromClient,
        });
    }
}
