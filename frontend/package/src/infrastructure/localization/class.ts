import { LocalizedMessages } from '../../shared';
import { DefaultLanguages } from './consts';
import { UndefinedLocalizedMessagesError } from './errors';
import { LocalizationMessages } from './localized_messages';

export type LocalizationServiceProps = {
    lang?: string;
    localizatedMessages?: LocalizedMessages;
};

export default class LocalizationService {
    public readonly lang: string;
    public readonly locales: LocalizedMessages;

    constructor(props?: LocalizationServiceProps) {
        this.lang = props?.lang ?? DefaultLanguages.ENGLISH;
        this.locales = this._setLocalizationMessages(this.lang, props?.localizatedMessages ?? LocalizationMessages);
    }

    private _setLocalizationMessages(lang: string, localizatedMessages: LocalizedMessages) {
        if (!this._hasLocalizatedMessagesForCurrentLang(lang, localizatedMessages))
            throw new UndefinedLocalizedMessagesError();

        return localizatedMessages[lang] as LocalizedMessages;
    }

    private _hasLocalizatedMessagesForCurrentLang(lang: string, localizatedMessages: LocalizedMessages) {
        return lang in localizatedMessages;
    }

    public getLocalizedMessageByKey(key: string) {
        let locales = this.locales;
        const keys = key.split('.');

        for (let i = 0; i < keys.length; i += 1) {
            const localeLevel = keys[i];
            if (typeof locales !== 'string') locales = locales[localeLevel] as LocalizedMessages;
            if (locales === undefined) break;
            if (typeof locales === 'string' && i === keys.length - 1) return locales;
        }

        return key;
    }
}
