import axios from 'axios';
import { ConnectionData } from '../../../types';

export default class HttpClient {
    private _url: string;
    private _headers: { [key: string]: string };

    constructor(connectionData: ConnectionData) {
        const { correlationId, integrationId, baseUrl, authenticationToken } = connectionData;

        const url = baseUrl === '/' ? window.location.origin : baseUrl;
        this._url = `${url}/utils/client-logs/log`;

        this._headers = {
            'X-Correlation-Id': correlationId,
        };

        if (integrationId) this._headers['integration-id'] = integrationId;
        if (authenticationToken) this._headers['Authorization'] = `Bearer ${authenticationToken}`;
    }

    post(data: unknown) {
        return axios.post(this._url, data, { headers: this._headers });
    }
}
