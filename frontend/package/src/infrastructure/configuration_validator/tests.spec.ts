/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from '../../../utils';
import {
    DEFAULT_APPLICANT_FIELDS,
    DISABLED_APPLICANT_FIELDS,
} from '../../shared';
import ConfigurationValidator from './class';
import {
    ComponentDisabledError,
    EnabledMotionControlWithoutFaceModelError,
    InvalidMotionControlAttemptCountError,
    NoComponentIdError,
    NoEnabledApplicantFieldsError,
    NoPrimaryApplicantFieldsError,
    NoPrimaryEnabledApplicantFieldsError,
    NotValidComponentIdError,
    SeveralPrimaryEnabledApplicantFieldsError,
    TimeToStartRecordLessThenOneSecondError,
} from './errors';

const validator = new ConfigurationValidator();

describe('Check that integration ID exist', () => {
    test.each(['00000000-0000-0000-0000-000000000000', 'abcdefg'])(
        'Valid value (%s) not must throw error',
        (integrationId: string) => {
            expect(() => validator.checkThatIntegrationIdExist(integrationId)).not.toThrowError();
        }
    );

    test.each(['', undefined])(
        'Not valid value (%s)  must throw error NoComponentIdError',
        (integrationId: string | undefined) => {
            expect(() => validator.checkThatIntegrationIdExist(integrationId)).toThrowError(new NoComponentIdError());
        }
    );
});

describe('Check that integration ID is valid UUID4', () => {
    test.each([
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        '123e4567-e89b-42d3-a456-426614174000',
    ])('Valid UUID4 (%s) not must throw error', (uuid: string) => {
        expect(() => validator.checkThatIntegrationIdIsValidUUID(uuid)).not.toThrowError();
    });

    test.each([
        '550e8400-e29b-11d4-a716-446655440000', // v1
        '550e8400e29b41d4a716446655440000',
        '550e8400-e29b-41d4-g716-446655440000',
        '550e8400-e29b-41d4-a716-44665544',
        '',
        'not-a-uuid-at-all',
    ])('Invalid UUID4 (%s) must throw error NotValidComponentIdError', (uuid: string) => {
        expect(() => validator.checkThatIntegrationIdIsValidUUID(uuid)).toThrowError(new NotValidComponentIdError());
    });
});

describe('Check that base URL exist', () => {
    test('Valid baseURL not must throw error', () => {
        expect(() => validator.checkThatIntegrationIdExist('00000000-0000-0000-0000-000000000000')).not.toThrowError();
    });

    test('Some string not must throw error', () => {
        expect(() => validator.checkThatIntegrationIdExist('abcdefg')).not.toThrowError();
    });

    test('Empty string must throw error NoComponentIdError', () => {
        expect(() => validator.checkThatIntegrationIdExist('')).toThrowError(new NoComponentIdError());
    });

    test('undefined must throw error NoComponentIdError', () => {
        expect(() => validator.checkThatIntegrationIdExist(undefined)).toThrowError(new NoComponentIdError());
    });
});

describe('Check that component enabled', () => {
    test.each([true])('Valid value (%s) not must throw error', (flag: boolean) => {
        expect(() => validator.checkThatComponentEnabled(flag)).not.toThrowError();
    });

    test.each([false, undefined, ''])('Valid value (%s) not must throw error ComponentDisabledError', (flag: any) => {
        expect(() => validator.checkThatComponentEnabled(flag)).toThrowError(new ComponentDisabledError());
    });
});

describe('Check that exist applicant field or applicant ID', () => {
    test.each(['00000000-0000-0000-0000-000000000000', 'abcdefg'])(
        'Applicant ID exist (%s) so not must throw error',
        (applicantId: string) => {
            expect(() =>
                validator.checkThatExistApplicantFieldOrApplicantId(applicantId, DISABLED_APPLICANT_FIELDS)
            ).not.toThrowError();
        }
    );

    test('Applicant ID is undefined, but has enabled primary field so not must throw error', () => {
        expect(() =>
            validator.checkThatExistApplicantFieldOrApplicantId(undefined, DEFAULT_APPLICANT_FIELDS)
        ).not.toThrowError();
    });

    test.each(['', undefined])(
        'If applicantId is (%s) and all applicantFields is disabled must throw error NoEnabledApplicantFieldsError',
        (applicantId: string | undefined) => {
            expect(() =>
                validator.checkThatExistApplicantFieldOrApplicantId(applicantId, DISABLED_APPLICANT_FIELDS)
            ).toThrowError(new NoEnabledApplicantFieldsError());
        }
    );

    test('If applicantFields not contains primary field must throw error NoPrimaryApplicantFieldsError', () => {
        expect(() =>
            validator.checkThatExistApplicantFieldOrApplicantId(undefined, {
                ...DEFAULT_APPLICANT_FIELDS,
                email: { primary: false, enabled: true },
            })
        ).toThrowError(new NoPrimaryApplicantFieldsError());
    });

    test('If applicantFields not contains enabled primary field must throw error NoPrimaryEnabledApplicantFieldsError', () => {
        expect(() =>
            validator.checkThatExistApplicantFieldOrApplicantId(undefined, {
                ...DEFAULT_APPLICANT_FIELDS,
                email: { primary: true, enabled: false },
                phone: { primary: false, enabled: true },
            })
        ).toThrowError(new NoPrimaryEnabledApplicantFieldsError());
    });

    test('If applicantFields contains several enabled primary field must throw error SeveralPrimaryEnabledApplicantFieldsError', () => {
        expect(() =>
            validator.checkThatExistApplicantFieldOrApplicantId(undefined, {
                ...DEFAULT_APPLICANT_FIELDS,
                phone: { primary: true, enabled: true },
            })
        ).toThrowError(new SeveralPrimaryEnabledApplicantFieldsError());
    });
});

test('Get enabled applicant fields', () => {
    expect(validator.getEnabledApplicantFields(DEFAULT_APPLICANT_FIELDS)).toEqual(['email']);
});

test('Get primary applicant fields', () => {
    expect(validator.getPrimaryApplicantFields(DEFAULT_APPLICANT_FIELDS)).toEqual(['email']);
});

test('Get primary enabled applicant fields', () => {
    expect(validator.getPrimaryEnabledApplicantFields(DEFAULT_APPLICANT_FIELDS)).toEqual(['email']);
});

describe('Check that Motion Control attemps count more than zero', () => {
    test.each([1, 10, 30])('Valid value (%i) not must throw error', (attempts: number) => {
        expect(() => validator.checkThatMotionControlAttempsCountMoreThanZero(attempts)).not.toThrowError();
    });

    test.each([-1, 0])(
        'Invalid value (%i) must throw error InvalidMotionControlAttemptCountError',
        (attempts: number) => {
            expect(() => validator.checkThatMotionControlAttempsCountMoreThanZero(attempts)).toThrowError(
                new InvalidMotionControlAttemptCountError()
            );
        }
    );
});

describe('Check that Motion Control disabled', () => {
    test.each([false, undefined])('Valid value (%s) not must throw error', (flag: any) => {
        expect(() => validator.checkThatMotionControlDisabled(flag)).not.toThrowError();
    });

    test.each([true])(
        'Invalid value (%s) must throw error EnabledMotionControlWithoutFaceModelError',
        (flag: boolean) => {
            expect(() => validator.checkThatMotionControlDisabled(flag)).toThrowError(
                new EnabledMotionControlWithoutFaceModelError()
            );
        }
    );
});

describe('Check that time to start record at least 1000 ms', () => {
    test.each([1000, 10_000])('Valid value (%i) not must throw error', (ms: number) => {
        expect(() => validator.checkThatTimeToStartRecordAtLeast1000ms(ms)).not.toThrowError();
    });

    test.each([0, -1000, 999])(
        'Invalid value (%s) must throw error TimeToStartRecordLessThenOneSecondError',
        (ms: any) => {
            expect(() => validator.checkThatTimeToStartRecordAtLeast1000ms(ms)).toThrowError(
                new TimeToStartRecordLessThenOneSecondError()
            );
        }
    );
});