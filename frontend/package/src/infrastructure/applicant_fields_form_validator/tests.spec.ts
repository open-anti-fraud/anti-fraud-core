import { expect, test } from '../../../utils';
import { ApplicantFieldNames, DEFAULT_APPLICANT_FIELDS } from '../../shared';
import ApplicantFieldsFormValidator from './class';

const validator = new ApplicantFieldsFormValidator();

const fieldTests: Record<
    ApplicantFieldNames,
    {
        longValue: string;
        invalidValues?: string[];
        validValue: string;
    }
> = {
    firstName: { longValue: 'a'.repeat(200), validValue: 'John' },
    lastName: { longValue: 'a'.repeat(200), validValue: 'Doe' },
    email: {
        longValue: 'test'.repeat(150) + '@test',
        invalidValues: ['test', 'test@', '@test', '@test.ru'],
        validValue: 'test@test.test',
    },
    phone: {
        longValue: '8'.repeat(51),
        invalidValues: ['+7 (495) ABC-DEFG', '++7 123 456', '12', '+1.202.555.0147', '+7 (495) 123_45_67'],
        validValue: '+1 202-555-0147',
    },
    referenceId: { longValue: 'a'.repeat(200), validValue: 'REF123' },
};

const keys = Object.keys(DEFAULT_APPLICANT_FIELDS) as ApplicantFieldNames[];

test.each(keys)('Return "IsRequired" message for %s field for "" value', async (fieldName) => {
    const result = await validator.validateField(fieldName, '');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('IsRequired');
});

test.each(keys)('Return "MaxLengthField" message for %s field for long value', async (fieldName) => {
    const result = await validator.validateField(fieldName, fieldTests[fieldName].longValue);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MaxLengthField');
});

keys.forEach((fieldName) => {
    const { invalidValues, validValue } = fieldTests[fieldName];

    if (invalidValues) {
        test.each(invalidValues)(`Return specific error for ${fieldName} field for value "%s"`, async (value) => {
            const result = await validator.validateField(fieldName, value);
            expect(result.valid).toBe(false);


            const expectedError =
                fieldName === 'email' ? 'InvalidEmail' : fieldName === 'phone' ? 'WrongPhone' : 'Invalid';
            expect(result.error).toBe(expectedError);
        });
    }

    test(`Successful validation for ${fieldName}`, async () => {
        const result = await validator.validateField(fieldName, validValue);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });
});
