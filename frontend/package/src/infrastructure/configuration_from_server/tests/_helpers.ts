import { http, HttpResponse } from 'msw';
import { server } from '../../../../utils';

import { ComponentMetaFromServer } from '../../../application';
import { baseClientConfiguration } from './mock';

export function useMockServer({
    response,
    baseUrl,
    integrationId,
}: {
    response: ComponentMetaFromServer;
    baseUrl: string;
    integrationId: string;
}) {
    const host = baseUrl === '/' ? '' : baseUrl;
    const id = integrationId ?? baseClientConfiguration.integrationId;

    server.use(
        http.get(`${host}/publicapi/api/v2/WebComponentIntegrations/${id}/Settings`, () => {
            return HttpResponse.json<ComponentMetaFromServer>(response);
        })
    );

    return server;
}
