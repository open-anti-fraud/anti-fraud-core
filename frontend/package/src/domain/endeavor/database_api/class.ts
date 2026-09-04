import { AxiosError } from 'axios';
import API from 'tdvc';
import { InvalidTokenError } from '../../../shared';
import endeavorFactory from '../model/factory';

export default class EndeavorDatabaseAPI {
    private _api: API;

    constructor(api: API) {
        this._api = api;
    }

    async create(applicantId: string) {
        try {
            const response = await this._api.getLRSEndeavor(applicantId);
            return endeavorFactory({ id: response.data.endeavor_id });
        } catch (err) {
            const code = (err as AxiosError)?.response?.status;
            if (code === 401 || code === 403) throw new InvalidTokenError();
            throw err;
        }
    }
}
