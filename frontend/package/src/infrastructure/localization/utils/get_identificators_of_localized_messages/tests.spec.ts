import getIdentificatorsOfLocalizedMessages from '.';
import { expect, test } from '../../../../../utils';

test('Get object keys for simpe obj with 1 key', () => {
    const keys = getIdentificatorsOfLocalizedMessages({ key: 'value' });
    expect(keys.length).toBe(1);
    expect(keys[0]).toBe('key');
});

test('Get object keys for simpe obj with 3 keys', () => {
    const keys = getIdentificatorsOfLocalizedMessages({ first: 'value', second: 'value', third: 'value' });
    expect(keys.length).toBe(3);
    expect(keys[0]).toBe('first');
    expect(keys[1]).toBe('second');
    expect(keys[2]).toBe('third');
});

test('Get the keys of an object with another object inside it', () => {
    const keys = getIdentificatorsOfLocalizedMessages({
        first: {
            second: {
                third: 'value',
            },
        },
        key: 'value',
    });

    expect(keys.length).toBe(2);
    expect(keys[0]).toBe('first.second.third');
    expect(keys[1]).toBe('key');
});
