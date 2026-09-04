import { afterEach, describe, expect, test, vi } from 'vitest';

import { successHTML5InfoRes } from './const';

import getHTML5Info from './get_html5_Info';
import { THTML5Info } from './types';
import { getErrorPromise, getInfoOrEmptyDataAfterTimeout } from '../helpers';

afterEach(() => {
    vi.unstubAllGlobals();
});

const waitTime = 2000;

describe('Get html5 info', () => {
    test('Test getting real data', async () => {
        const data = await getHTML5Info(waitTime);
        expect(data).toStrictEqual(successHTML5InfoRes);
    });

    test('Test race for abort case', async () => {
        const fn = new Promise<THTML5Info>((resolve) => {
            setTimeout(() => resolve({}), 4000);
        });

        const data = await getInfoOrEmptyDataAfterTimeout<THTML5Info>(waitTime, fn, {});
        expect(data).toStrictEqual({});
    });

    test('Test race for error case', async () => {
        const data = await getInfoOrEmptyDataAfterTimeout<THTML5Info>(waitTime, getErrorPromise<THTML5Info>, {});
        expect(data).toStrictEqual({});
    });
});
