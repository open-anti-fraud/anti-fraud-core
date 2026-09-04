import { getEnabledApplicantFields, getPrimaryApplicantFields, getPrimaryEnabledApplicantFields } from '../../domain';
import { ApplicantFields, isValidUUID4 } from '../../shared';
import {
    ComponentDisabledError,
    EnabledMotionControlWithoutFaceModelError,
    InvalidAuthenticationTokenError,
    InvalidMotionControlAttemptCountError,
    NoBaseUrlError,
    NoComponentIdError,
    NoEnabledApplicantFieldsError,
    NoPrimaryApplicantFieldsError,
    NoPrimaryEnabledApplicantFieldsError,
    NotValidComponentIdError,
    SeveralPrimaryEnabledApplicantFieldsError,
    TimeToStartRecordLessThenOneSecondError,
} from './errors';

export default class ConfigurationValidator {
    public checkThatIntegrationIdExist(uuid4?: string) {
        if (!uuid4) throw new NoComponentIdError();
    }

    public checkThatIntegrationIdIsValidUUID(uuid4: string) {
        if (!isValidUUID4(uuid4)) throw new NotValidComponentIdError();
    }

    public checkThatBaseUrlExist(url?: string) {
        if (!url) throw new NoBaseUrlError();
    }

    public checkThatComponentEnabled(enabled: boolean) {
        if (!enabled) throw new ComponentDisabledError();
    }

    public checkThatExistApplicantFieldOrApplicantId(
        applicantId: string | undefined,
        applicantFields: ApplicantFields
    ) {
        if (applicantId) return;

        const enabledApplicantFields = this.getEnabledApplicantFields(applicantFields);
        const primaryApplicantFields = this.getPrimaryApplicantFields(applicantFields);
        const countPrimaryEnabledApplicantFields = this.getPrimaryEnabledApplicantFields(applicantFields);

        if (enabledApplicantFields.length === 0 && !applicantId) throw new NoEnabledApplicantFieldsError();
        if (primaryApplicantFields.length === 0) throw new NoPrimaryApplicantFieldsError();
        if (countPrimaryEnabledApplicantFields.length === 0) throw new NoPrimaryEnabledApplicantFieldsError();
        if (countPrimaryEnabledApplicantFields.length > 1) throw new SeveralPrimaryEnabledApplicantFieldsError();
    }

    public getEnabledApplicantFields(applicantFields: ApplicantFields) {
        return getEnabledApplicantFields(applicantFields);
    }

    public getPrimaryApplicantFields(applicantFields: ApplicantFields) {
        return getPrimaryApplicantFields(applicantFields);
    }

    public getPrimaryEnabledApplicantFields(applicantFields: ApplicantFields) {
        return getPrimaryEnabledApplicantFields(applicantFields);
    }

    public checkThatMotionControlAttempsCountMoreThanZero(attemptsCount: number) {
        if (attemptsCount <= 0) throw new InvalidMotionControlAttemptCountError();
    }

    public checkThatMotionControlDisabled(motionContolEnabled: boolean) {
        if (motionContolEnabled) throw new EnabledMotionControlWithoutFaceModelError();
    }

    public checkThatTimeToStartRecordAtLeast1000ms(timeToStartRecord: number) {
        if (timeToStartRecord < 1000) throw new TimeToStartRecordLessThenOneSecondError();
    }

    public checkThatAuthenticationTokenExist(token: string | undefined){
        if(token === undefined || token === "") throw new InvalidAuthenticationTokenError();
    };
}
