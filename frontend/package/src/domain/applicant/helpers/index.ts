import { APPLICANT_FIELDS, ApplicantFields } from '../../../shared';

export function getEnabledApplicantFields(applicantFields: ApplicantFields) {
    return APPLICANT_FIELDS.filter((key) => applicantFields?.[key].enabled);
}

export function getPrimaryApplicantFields(applicantFields: ApplicantFields) {
    return APPLICANT_FIELDS.filter((key) => applicantFields?.[key].primary);
}

export function getPrimaryEnabledApplicantFields(applicantFields: ApplicantFields) {
    return APPLICANT_FIELDS.filter((key) => applicantFields?.[key].primary && applicantFields?.[key].enabled);
}
