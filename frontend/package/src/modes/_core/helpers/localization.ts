import { LocalizationService } from '../../../infrastructure';
import { WebComponentError } from '../../../shared';

export function getCurrentStageLocalizatedName(stageName: string | undefined) {
    switch (stageName) {
        case 'IdentifyFacePositionStage':
        case 'MotionControlStage':
        case 'TakeFaceBestshotsStage':
            return 'BiomertricalChecks';

        case 'HandleBestshotStage':
        case 'ValidateFlowResultStage':
            return 'ValidateFlowResult';

        default:
            return 'Initialization';
    }
}

export function getLocalizatedErrorMessage(
    localizator: LocalizationService,
    error: WebComponentError,
    baseLocalePath?: string
) {
    const base = baseLocalePath ? baseLocalePath : 'Errors';
    const messageKeyLocale = localizator?.getLocalizedMessageByKey(`${base}.${error.name}`);
    const codeKeyLocale = localizator?.getLocalizedMessageByKey(`${base}.${error.code}`);

    const isMessageKeyLocaleFound = !messageKeyLocale?.startsWith('Errors.');
    const iscodeKeyLocaleFound = !codeKeyLocale?.startsWith('Errors.');

    const messageLocale = isMessageKeyLocaleFound
        ? messageKeyLocale
        : iscodeKeyLocaleFound
        ? codeKeyLocale
        : messageKeyLocale;
    const codeLocale = localizator?.getLocalizedMessageByKey(`MessageCode`);
    const errorCode = error.code;

    return `${messageLocale}. ${codeLocale} ${errorCode}`;
}
