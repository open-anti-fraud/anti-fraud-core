export type ApplicantSettingsBlock = {
    applicantId: string;
    applicantFields: ApplicantFields;
};

export type ApplicantFields = {
    firstName: ApplicantFieldSettings;
    lastName: ApplicantFieldSettings;
    phone: ApplicantFieldSettings;
    email: ApplicantFieldSettings;
    referenceId: ApplicantFieldSettings;
};

export type ApplicantFieldSettings = {
    enabled: boolean;
    primary: boolean;
};

export type ApplicantFieldNames = 'firstName' | 'lastName' | 'phone' | 'email' | 'referenceId';

export type LiteApplicantSettingsBlock = {
    applicantPhoto: string;
};

