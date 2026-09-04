import { AxiosError } from 'axios';
import API from 'tdvc';
import { InvalidTokenError } from '../../../shared';
import { ApplicantNotFoundError } from '../errors';
import { applicantFactory } from '../model';

export default class ApplicantDatabaseAPI {
    private _api: API;

    constructor(api: API) {
        this._api = api;
    }

    async create(data: [string, FormDataEntryValue][]) {
        try {
            const response = await this._api.createApplicant(data);
            return applicantFactory({ id: response.data.applicantId, status: 0 });
        } catch (err) {
            this._handleInvalidTokenError(err);
            throw err;
        }
    }

    async getByPrimaryField(data: string) {
        try {
            const response = await this._api.getApplicantByFilter(data);
            if (!response.data || response.data.items.length < 0) throw new ApplicantNotFoundError();
            return applicantFactory({
                id: response.data.items[0].applicantId,
                status: Number(response.data.items[0].status),
            });
        } catch (err) {
            this._handleInvalidTokenError(err);
            throw new ApplicantNotFoundError();
        }
    }

    async getById(id: string) {
        try {
            const response = await this._api.getApplicantByID(id);
            if (!response.data) throw new ApplicantNotFoundError();
            return applicantFactory({ id: response.data.applicantId, status: Number(response.data.status) });
        } catch (err) {
            this._handleInvalidTokenError(err);
            throw new ApplicantNotFoundError();
        }
    }

    async validateApplicant(applicantdId: string, attemptId: number, configuration: object) {
        try {
            const response = await this._api.validateApplicant(applicantdId, attemptId, configuration);
            return response.data;
        } catch (err) {
            this._handleInvalidTokenError(err);
            throw err;
        }
    }

    private _handleInvalidTokenError(err: unknown) {
        const code = (err as AxiosError)?.response?.status;
        if (code === 401 || code === 403) throw new InvalidTokenError();
    }
}
