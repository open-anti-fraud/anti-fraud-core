import { ApplicantFieldNames } from '../../shared';

export const labelTextMap: { [key in ApplicantFieldNames]: string } = {
    email: 'Email',
    firstName: 'FirstName',
    lastName: 'LastName',
    phone: 'Phone',
    referenceId: 'ReferenceId',
};

export const typeMap: { [key in ApplicantFieldNames]: string } = {
    email: 'email',
    firstName: 'text',
    lastName: 'text',
    phone: 'phone',
    referenceId: 'text',
};
