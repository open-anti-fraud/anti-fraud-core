import { TIntlInfo } from './types';


export const successInternationalizationInfoRes: TIntlInfo = {
	currentLanguage: 'en-US',
	preferredLanguages: 'en-US, en',
	datetime: {
		timezone: 'Asia/Yekaterinburg',
		calendar: 'gregory',
		numberingSystem: 'latn',
		weekInfo: {
			firstDay: 7,
			weekend: [6, 7],
		},
	},
};

export const DEFAULT_INTERNATIONALIZATION_DATA = {
	datetime: {
		calendar: undefined,
		numberingSystem: undefined,
		timezone: undefined,
		weekInfo: undefined,
	},
	currentLanguage: undefined,
	preferredLanguages: undefined,
};