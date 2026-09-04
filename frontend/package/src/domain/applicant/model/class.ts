import { ApplicantBlockedError, FlowMode } from '../../../shared';
import { ApplicantAlreadyExistError, ApplicantNotRegisterError, ApplicantUnconfirmedError } from '../errors';

export type ApplicantProps = {
    id: string;
    status: number;
};

export default class Applicant {
    private _id: string;
    private _status: number;

    constructor({ id, status }: ApplicantProps) {
        this._id = id;
        this._status = status;
    }

    get id() {
        return this._id;
    }

    get status() {
        return this._status;
    }

    public validateApplicantStatus(mode: FlowMode) {
        if (mode === 'authorization') {
            this._validateForAuthorizationMode();
        } else {
            this._validateForRegistrationMode();
        }
    }

    public _validateForAuthorizationMode() {
        if ([0, 5].includes(this._status)) throw new ApplicantNotRegisterError();
        if ([2, 3].includes(this._status)) throw new ApplicantBlockedError();
        if ([6].includes(this._status)) throw new ApplicantUnconfirmedError();
    }

    public _validateForRegistrationMode() {
        if ([1].includes(this._status)) throw new ApplicantAlreadyExistError();
        if ([2, 3].includes(this._status)) throw new ApplicantBlockedError();
    }
}
