import { getInfoOrEmptyDataAfterTimeout, getValueFromAwaitedPromise } from '../helpers';
import { DEFAULT_INTERNATIONALIZATION_DATA } from './const';
import { TIntDatetimeInfo, TIntlInfo, TWeekInfo } from './types';

export default async function getInternationalizationInfo(timeout: number): Promise<TIntlInfo> {
    const data = await Promise.allSettled([
        getCurrentLanguage(timeout),
        getPreferredLanguages(timeout),
        getDateFormat(timeout),
    ]);
    return {
        currentLanguage: getValueFromAwaitedPromise(data[0]) as string,
        preferredLanguages: getValueFromAwaitedPromise(data[1]) as string,
        datetime: getValueFromAwaitedPromise(data[2]) as TIntDatetimeInfo,
    };
}

function getCurrentLanguage(timeout = 2000) {

    return getInfoOrEmptyDataAfterTimeout<string | undefined>(timeout, () => navigator.language, undefined);
}

function getPreferredLanguages(timeout = 2000) {



    return getInfoOrEmptyDataAfterTimeout<string | undefined>(timeout, () => navigator.languages.join(', '), undefined);
}

function getDateFormat(timeout = 2000) {
    return getInfoOrEmptyDataAfterTimeout<object | undefined>(
        timeout,
        () => {
            const localeDate = new Intl.DateTimeFormat(navigator.language, {
                dateStyle: 'full',
                timeStyle: 'long',
            });

            const { calendar, numberingSystem } = localeDate.resolvedOptions();

            const { weekInfo } = new Intl.Locale(navigator.language) as {
                weekInfo?: TWeekInfo;
                collations?: string[];
            };


            return {
                timezone: localeDate.resolvedOptions().timeZone,
                calendar,
                numberingSystem,
                weekInfo,
            };
        },
        DEFAULT_INTERNATIONALIZATION_DATA
    );
}
