import { LocalizationService } from '../../../infrastructure';
import { FlowMode } from '../../../shared';
import { SessionIdHint } from '../../../ui';
import View from '../web_component.view';

export function renderSessionUUID(element: SessionIdHint, uuid: string) {
    element?.setText(`ID: ${uuid}`);
}

export function renderPageHeading(view: View, mode: FlowMode, localizator: LocalizationService | undefined) {
    const flowMode = mode === 'registration' ? 'Registration' : 'Authorization';
    const localizedHeaderText = localizator?.getLocalizedMessageByKey(`Mode.${flowMode}`);
    view.setHeading(localizedHeaderText);
}

export function renderPrepareEnvironmentPreloader(view: View, localizator: LocalizationService | undefined) {
    const localizedMessage = localizator?.getLocalizedMessageByKey('PreparingEnvironment');
    view.setPreloader(localizedMessage);
}
