import { AxiosError } from 'axios';
import API from 'tdvc';
import { InvalidTokenError } from '../../../shared';
import attemptFactory from '../model/factory';

export default class AttemptDatabaseAPI {
    private _api: API;

    constructor(api: API) {
        this._api = api;
    }

    async create(applicantId: string, endeavorId: string, fingerprint: object) {
        try {
            const response = await this._api.createAttempt(applicantId, endeavorId, fingerprint);
            return attemptFactory({ id: response.data.attemptId });
        } catch (err) {
            const code = (err as AxiosError)?.response?.status;
            if (code === 401 || code === 403) throw new InvalidTokenError();
            throw err;
        }
    }
}
