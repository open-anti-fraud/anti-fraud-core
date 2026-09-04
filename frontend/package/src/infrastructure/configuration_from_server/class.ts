import { ComponentMetaFromServer } from '../../application';
import { InvalidTokenError, WebComponentError } from '../../shared';
import { FailedFetchOfConfigurationError, NoExistIntegrationError, NoRequiredConfigurationFieldsError } from './errors';

export default class ConfigurationFromServer {
    public async fetch(baseUrl: string, integrationId: string, correlationId: string, authenticationToken = '') {
        try {
            const url = this._createUrl(baseUrl, integrationId);
            const headers = this._createHeaders(correlationId, authenticationToken);
            const response = await fetch(url, {
                referrerPolicy: 'origin',
                headers,
            });
            if (response.status === 401 || response.status === 403) throw new InvalidTokenError();

            const data = await response.json();
            if (data.code === '120024') {
                if (data.message.includes('Integration')) throw new NoExistIntegrationError();
                throw new WebComponentError(data.message);
            }

            if (!('settings' in data)) throw new NoRequiredConfigurationFieldsError();

            return data as ComponentMetaFromServer;
        } catch (err) {
            if (err instanceof WebComponentError) throw err;
            throw new FailedFetchOfConfigurationError();
        }
    }

    private _createHeaders(correlationId: string, authenticationToken: string) {
        const headers: { [key: string]: string } = {
            'X-Correlation-Id': correlationId,
        };

        if (authenticationToken) headers['Authorization'] = `Bearer ${authenticationToken}`;

        return headers;
    }

    public _createUrl(baseUrl: string, integrationId: string) {
        const requestBaseUrl = baseUrl === '/' ? '' : baseUrl;
        return `${requestBaseUrl}/publicapi/api/v2/WebComponentIntegrations/${integrationId}/Settings`;
    }
}
