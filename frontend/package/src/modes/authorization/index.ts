import { ComponentSettingsFromClient } from '../../application';
import WebComponent from '../_core/web_component';

export default class TDVAthorizationOnboarding extends WebComponent {
    constructor(configurationFromClient: ComponentSettingsFromClient) {
        super({
            mode: 'authorization',
            configurationFromClient,
        });
    }
}
