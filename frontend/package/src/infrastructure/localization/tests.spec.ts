import { describe, expect, test } from '../../../utils';
import { LocalizedMessages } from '../../shared';
import LocalizationService from './class';
import { DefaultLanguages } from './consts';
import { UndefinedLocalizedMessagesError } from './errors';
import { LocalizationMessages } from './localized_messages';

describe('Tests initialization for default languages', () => {
    test('By default set English language', () => {
        const localizationService = new LocalizationService();
        expect(localizationService.lang).toBe(DefaultLanguages.ENGLISH);
    });

    test('By default use English localized messages', () => {
        const localizationService = new LocalizationService();
        expect(localizationService.locales).toBe(LocalizationMessages.en);
    });

});

describe('Tests initialization for custom language and localized messages', () => {
    test('Edit default localized messages', () => {
        const locales = {
            ...LocalizationMessages,
            [DefaultLanguages.ENGLISH]: {
                ...LocalizationMessages.en,
                Stages: {
                    ...LocalizationMessages.en.Stages,
                    Initialization: {
                        ...LocalizationMessages.en.Stages.Initialization,
                        IdentifyApplicantStatus: {
                            ...LocalizationMessages.en.Stages.Initialization.IdentifyApplicantStatus,
                            SubmitButton: {
                                ...LocalizationMessages.en.Stages.Initialization.IdentifyApplicantStatus.SubmitButton,
                                Authorization: 'Auth',
                            },
                        },
                    },
                },
            },
        };

        let localizationService = new LocalizationService({ localizatedMessages: locales });
        expect(localizationService.locales).toEqual(locales.en);

    });

    test('Add new lang and localized messages', () => {
        const locales = {
            ...LocalizationMessages,
            fr: {
                Login: {
                    Authorization: 'Se Connecter',
                },
            } as LocalizedMessages,
        };

        const localizationService = new LocalizationService({ lang: 'fr', localizatedMessages: locales });
        expect(localizationService.locales).toEqual(locales.fr);
    });

    test('Try new lang and without localized messages', () => {
        expect(() => new LocalizationService({ lang: 'fr' })).toThrowError(new UndefinedLocalizedMessagesError());
    });
});

describe('Tests for receiving a localized text message', () => {
    test('Return localized message by key', () => {
        const locales = {
            ...LocalizationMessages,
            [DefaultLanguages.ENGLISH]: {
                ...LocalizationMessages.en,
                Stages: {
                    ...LocalizationMessages.en.Stages,
                    Initialization: {
                        ...LocalizationMessages.en.Stages.Initialization,
                        IdentifyApplicantStatus: {
                            ...LocalizationMessages.en.Stages.Initialization.IdentifyApplicantStatus,
                            SubmitButton: {
                                ...LocalizationMessages.en.Stages.Initialization.IdentifyApplicantStatus.SubmitButton,
                                Authorization: 'Auth',
                            },
                        },
                    },
                },
            },
        };

        const localizationService = new LocalizationService({ localizatedMessages: locales });
        const currentValue = localizationService.getLocalizedMessageByKey(
            'Stages.Initialization.IdentifyApplicantStatus.SubmitButton.Authorization'
        );
        const expectValue =
            locales[DefaultLanguages.ENGLISH].Stages.Initialization.IdentifyApplicantStatus.SubmitButton.Authorization;
        expect(currentValue).toEqual(expectValue);
    });

    test('Return key if localized message by key not found', () => {
        const localizationService = new LocalizationService();
        expect(localizationService.getLocalizedMessageByKey('Not.Existed.Key')).toEqual('Not.Existed.Key');
    });
});
