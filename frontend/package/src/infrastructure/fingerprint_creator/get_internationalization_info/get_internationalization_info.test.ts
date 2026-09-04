import { afterEach, describe, expect, test, vi } from 'vitest';
import { getErrorPromise, getInfoOrEmptyDataAfterTimeout } from '../helpers';
import {
    DEFAULT_INTERNATIONALIZATION_DATA,
    successInternationalizationInfoRes,
} from './const';

import getInternationalizationInfo from './get_internationalization_info';
import { TIntlInfo } from './types';

afterEach(() => {
	vi.unstubAllGlobals();
});

const waitTime = 2000;

describe('Get internationalization info', () => {
	test('Test getting real data', async () => {
		const data = await getInternationalizationInfo(waitTime);
		expect(data.currentLanguage).toBe(
			successInternationalizationInfoRes.currentLanguage
		);
		expect(data.preferredLanguages).toBe(
			successInternationalizationInfoRes.preferredLanguages
		);
		expect(data.datetime.calendar).toBe(
			successInternationalizationInfoRes.datetime.calendar
		);
		expect(data.datetime.numberingSystem).toBe(
			successInternationalizationInfoRes.datetime.numberingSystem
		);
		expect(data.datetime.timezone).toBe(
			successInternationalizationInfoRes.datetime.timezone
		);
		expect(data.datetime.weekInfo).toStrictEqual(
			successInternationalizationInfoRes.datetime.weekInfo
		);
	});

	test('Test race for abort case', async () => {
		const fn = new Promise<TIntlInfo>((resolve) => {
			setTimeout(() => resolve(getInternationalizationInfo(4000)), 4000);
		});

		const data = await getInfoOrEmptyDataAfterTimeout<TIntlInfo>(
			waitTime,
			fn,
			DEFAULT_INTERNATIONALIZATION_DATA
		);
		expect(data).toStrictEqual(DEFAULT_INTERNATIONALIZATION_DATA);
	});

	test('Test race for error case', async () => {
		const data = await getInfoOrEmptyDataAfterTimeout<TIntlInfo>(
			waitTime,
			getErrorPromise<TIntlInfo>,
			DEFAULT_INTERNATIONALIZATION_DATA
		);
		expect(data).toStrictEqual(DEFAULT_INTERNATIONALIZATION_DATA);
	});
});
