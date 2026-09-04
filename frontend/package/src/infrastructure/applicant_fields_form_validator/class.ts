import * as yup from 'yup';
import { ApplicantFieldNames } from '../../shared';

const ValidationSchemas = {
    firstName: yup.string().required('IsRequired').max(150, 'MaxLengthField'),
    lastName: yup.string().required('IsRequired').max(150, 'MaxLengthField'),
    email: yup.string().required('IsRequired').email('InvalidEmail').max(150, 'MaxLengthField'),
    phone: yup
        .string()
        .required('IsRequired')
        .matches(/^\+?[0-9]{1,4}?[ \-()]?(\(?[0-9]{2,4}\)?[ \-()]?)*[0-9]{2,4}$/, 'WrongPhone')
        .max(50, 'MaxLengthField'),
    referenceId: yup.string().required('IsRequired').max(150, 'MaxLengthField'),
};

export default class ApplicantFieldsFormValidator {
    public async validateField(
        fieldName: ApplicantFieldNames,
        value: string
    ): Promise<{ valid: boolean; error?: string }> {
        try {
            await ValidationSchemas[fieldName].validate(value);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: (error as yup.ValidationError).message };
        }
    }
}
