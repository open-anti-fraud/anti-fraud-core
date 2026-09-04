import { LocalizedMessages } from '../../../../shared';
import EnglishLocalizatedMessages from '../../localized_messages/en';

export default function getIdentificatorsOfLocalizedMessages(obj: LocalizedMessages): string[] {
    const keys: string[] = [];

    Object.keys(obj).map((key) => {
        if (typeof obj[key] == 'string') {
            keys.push(key);
        } else if (typeof obj[key] === 'object') {
            const parentKey = key;
            const nestedObjKeys = getIdentificatorsOfLocalizedMessages(obj[key]);
            nestedObjKeys.forEach((nestedObjKey) => {
                keys.push(`${parentKey}.${nestedObjKey}`);
            });
        }
    });

    return keys;
}

getIdentificatorsOfLocalizedMessages(EnglishLocalizatedMessages);
