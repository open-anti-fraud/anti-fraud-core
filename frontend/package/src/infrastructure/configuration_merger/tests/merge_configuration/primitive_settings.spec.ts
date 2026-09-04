import { expect, test } from '../../../../../utils';
import { LivenessTransport } from '../../../../shared';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

test('Merge networksPath setting', async () => {
    expect(
        validator.merge({
            clientSettings: { ...baseClientConfiguration, networksPath: '/' },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        networksPath: '/',
    });
});

test('Merge livenessTransport setting', async () => {
    expect(
        validator.merge({
            clientSettings: { ...baseClientConfiguration, livenessTransport: LivenessTransport.WEB_SOCKET },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        livenessTransport: LivenessTransport.WEB_SOCKET,
    });
});

test('Merge fingerprintWaitTime setting', async () => {
    expect(
        validator.merge({
            clientSettings: { ...baseClientConfiguration, fingerprintWaitTime: 10000 },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        fingerprintWaitTime: 10000,
    });
});
