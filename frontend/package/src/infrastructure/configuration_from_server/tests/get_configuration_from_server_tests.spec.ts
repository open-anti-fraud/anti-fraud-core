import { expect, test } from '../../../../utils';
import ConfigurationFromServer from '../class';
import { FailedFetchOfConfigurationError } from '../errors';
import { useMockServer } from './_helpers';
import { baseClientConfiguration, serverMeta } from './mock';

test('Get config from server', async () => {
    useMockServer({ ...baseClientConfiguration, response: serverMeta });
    const configuration = new ConfigurationFromServer();
    await expect(
        configuration.fetch('/', '28608d66-a571-44ec-94db-04a00143ff51', '00000000-0000-0000-0000-000000000000')
    ).resolves.toStrictEqual(serverMeta);
});

test('Throw error if invalid integrationId', async () => {
    useMockServer({
        ...baseClientConfiguration,
        integrationId: '00000000-0000-0000-0000-000000000000',
        response: serverMeta,
    });
    const configuration = new ConfigurationFromServer();
    await expect(
        configuration.fetch('/', '28608d66-a571-44ec-94db-04a00143ff51', '00000000-0000-0000-0000-000000000000')
    ).rejects.toThrowError(new FailedFetchOfConfigurationError());
});
