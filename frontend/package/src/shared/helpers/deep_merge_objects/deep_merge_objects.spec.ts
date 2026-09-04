import { describe, expect, test } from '../../../../utils';
import deepMergeObjects from './deep_merge_objects';

describe('Merge Objects function Tests', () => {
    test('Return undefined if the value doesn`t exists in both objects and no default value', () => {
        const key = 'key';
        const firstObject = {};
        const secondObject = {};

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(undefined);
    });

    test('Return undefined if the value is null in both objects and no default value ', () => {
        const key = 'key';
        const firstObject = null;
        const secondObject = null;

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(undefined);
    });

    test('Return defaultValue if the value doesn`t exists in both objects, but has default value ', () => {
        const key = 'key';
        const firstObject = {};
        const secondObject = {};
        const defaultValue = 'value';

        expect(deepMergeObjects({ firstObject, secondObject, key, defaultValue })).toEqual(defaultValue);
    });

    test('Return defaultValue if the value is null in both objects, but has default value ', () => {
        const key = 'key';
        const firstObject = null;
        const secondObject = null;
        const defaultValue = 'value';

        expect(deepMergeObjects({ firstObject, secondObject, key, defaultValue })).toEqual(defaultValue);
    });

    test('Return value from firstObject if the primitive value exists in both objects', () => {
        const key = 'key';
        const firstValue = 'Value';
        const secondValue = 'Value';

        const firstObject = { [key]: firstValue };
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(firstValue);
    });

    test('Return value from firstObject if the primitive value exists in firstObject and secondObject is null', () => {
        const key = 'key';
        const firstValue = 'Value';

        const firstObject = { [key]: firstValue };
        const secondObject = null;

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(firstValue);
    });

    test('Return value from secondObject if the primitive value exists in secondObject and firstObject is null', () => {
        const key = 'key';
        const secondValue = 'Value';

        const firstObject = null;
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(secondValue);
    });

    test('Return value from secondObject if the primitive value exists only in secondObject', () => {
        const key = 'key';
        const secondValue = 'Value';

        const firstObject = {};
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(secondValue);
    });

    test('Return value from firstObject if the primitive value exists only in firstObject', () => {
        const key = 'key';
        const firstValue = 'Value';

        const firstObject = { [key]: firstValue };
        const secondObject = {};

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(firstValue);
    });

    test('Return value from secondObject if the primitive value has value only in secondObject', () => {
        const key = 'key';
        const firstValue = undefined;
        const secondValue = 'Value';

        const firstObject = { [key]: firstValue };
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(secondValue);
    });

    test('Return value from firstObject if the primitive value has value only in firstObject', () => {
        const key = 'key';
        const firstValue = 'Value';
        const secondValue = undefined;

        const firstObject = { [key]: firstValue };
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual(firstValue);
    });

    test('Overwriting part of the fields of the second object with values from the first object', () => {
        const key = 'key';
        const firstValue = {
            key_lv2_1: { key_lv3_1: true, key_lv3_2: 'value' },
            key_lv2_2: { key_lv3_3: false, key_lv3_: 1 },
        };
        const secondValue = {
            key_lv2_1: { key_lv3_1: false, key_lv3_2: 'string' },
            key_lv2_2: { key_lv3_3: true, key_lv3_: 100 },
            key_lv2_3: () => {},
            key_lv2_4: {
                key_lv2_5: 'some object',
            },
        };

        const firstObject = { [key]: firstValue };
        const secondObject = { [key]: secondValue };

        expect(deepMergeObjects({ firstObject, secondObject, key })).toEqual({
            ...secondValue,
            ...firstValue,
        });
    });

    test('Supplement the settings from the server with default settings if the server has incomplete settings', () => {
        const key = 'key';

        const defaultValue = {
            description: {
                enabled: true,
                autoSubmit: {
                    enabled: false,
                    timer: 30000,
                },
            },
            order: 0,
            enabled: true,
            attemptsCount: 3,
            faceBorder: {
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
            },
        };

        const secondValue = {
            faceBorder: {
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
            },
            enabled: true,
            order: 0,
            attemptsCount: 100,
        };

        const firstObject = undefined;
        const secondObject = {
            [key]: secondValue,
        };

        expect(deepMergeObjects({ firstObject, secondObject, defaultValue, key })).toEqual({
            ...defaultValue,
            ...secondValue,
        });
    });

    test('Supplement the settings from the client with default settings if the client has incomplete settings', () => {
        const key = 'key';

        const defaultValue = {
            description: {
                enabled: true,
                autoSubmit: {
                    enabled: false,
                    timer: 30000,
                },
            },
            order: 0,
            enabled: true,
            attemptsCount: 3,
            faceBorder: {
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
            },
        };

        const firstValue = {
            faceBorder: {
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
            },
            enabled: true,
            order: 0,
            attemptsCount: 100,
        };

        const firstObject = {
            [key]: firstValue,
        };
        const secondObject = undefined;

        expect(deepMergeObjects({ firstObject, secondObject, defaultValue, key })).toEqual({
            ...defaultValue,
            ...firstValue,
        });
    });

    test('Merge client, server settings and default values', () => {
        const key = 'key';

        const defaultValue = {
            description: {
                enabled: true,
                autoSubmit: {
                    enabled: false,
                    timer: 30000,
                },
            },
            order: 0,
            enabled: true,
            attemptsCount: 3,
            faceBorder: {
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
            },
        };

        const secondValue = {
            faceBorder: {
                faceWidthCoefficients: {
                    fullHd: 20,
                    hd: 24,
                    sd: 33,
                },
                allowableAccuracyError: {
                    x: 20,
                    y: 30,
                },
            },
            enabled: true,
            order: 0,
            attemptsCount: 100,
        };

        const firstObject = {
            [key]: {
                attemptsCount: 5,
            },
        };
        const secondObject = {
            [key]: secondValue,
        };

        expect(deepMergeObjects({ firstObject, secondObject, defaultValue, key })).toEqual({
            ...defaultValue,
            ...secondValue,
            attemptsCount: 5,
        });
    });
});
