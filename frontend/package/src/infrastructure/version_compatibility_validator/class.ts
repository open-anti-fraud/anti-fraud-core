import { InvalidTokenError, WebComponentError } from '../../shared';
import { VersionCompatibilityError } from './errors';

export default class VersionCompatibilityValidator {
    private _responseStatus: number | undefined = undefined;

    async validate(id: string, baseUrl: string, version: string, correlationId: string, authenticationToken = '') {
        if (this._responseStatus === undefined)
            this._responseStatus = await this._sendRequest(id, baseUrl, version, correlationId, authenticationToken);
        this._handleStatus();
    }

    async _sendRequest(
        id: string,
        baseUrl: string,
        version: string,
        correlationId: string,
        authenticationToken: string
    ) {
        const url = this._createUrl(baseUrl, version);
        const headers = this._createHeaders(id, correlationId, authenticationToken);
        const response = await fetch(url, { headers });
        return response.status;
    }

    private _createHeaders(id: string, correlationId: string, authenticationToken: string) {
        const headers: { [key: string]: string } = {
            Integration: id,
            'X-Correlation-Id': correlationId,
        };

        if (authenticationToken) headers['Authorization'] = `Bearer ${authenticationToken}`;

        return headers;
    }

    private _createUrl(baseUrl: string, version: string) {
        const requestBaseUrl = baseUrl === '/' ? '' : baseUrl;
        return `${requestBaseUrl}/publicapi/api/v2/component/Utility/CheckCompatibility?componentVersion=${version}`;
    }

    private _handleStatus() {
        if (this._responseStatus === 200) return;
        if (this._responseStatus === 401 || this._responseStatus === 403) throw new InvalidTokenError();
        if (this._responseStatus === 400) throw new VersionCompatibilityError();
        throw new WebComponentError({ message: `Server return ${this._responseStatus} status code` });
    }
}
