import { ApplicantFieldNames, ApplicantFields } from '../types';

export const APPLICANT_FIELDS: ApplicantFieldNames[] = ['firstName', 'lastName', 'phone', 'email', 'referenceId'];

export const DEFAULT_APPLICANT_FIELDS: ApplicantFields = {
    email: { enabled: true, primary: true },
    phone: { enabled: false, primary: false },
    firstName: { enabled: false, primary: false },
    lastName: { enabled: false, primary: false },
    referenceId: { enabled: false, primary: false },
};

export const DISABLED_APPLICANT_FIELDS: ApplicantFields = {
    email: { enabled: false, primary: false },
    phone: { enabled: false, primary: false },
    firstName: { enabled: false, primary: false },
    lastName: { enabled: false, primary: false },
    referenceId: { enabled: false, primary: false },
};