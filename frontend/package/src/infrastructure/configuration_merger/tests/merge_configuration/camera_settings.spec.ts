import { expect, test } from '../../../../../utils';
import { CameraResolutions } from '../../../../shared';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

test('Merge cameraId setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                cameraSettings: {
                    cameraId: '06e6515a-f077-466d-9ac3-74a2500ae7fc',
                },
            },
            serverSettings: {
                ...serverMeta.settings,
                cameraSettings: {
                    ...serverMeta.settings.cameraSettings,
                },
            },
        })
    ).toEqual({
        ...validConfiguration,
        cameraSettings: {
            ...serverMeta.settings.cameraSettings,
            cameraId: '06e6515a-f077-466d-9ac3-74a2500ae7fc',
        },
    });
});

test('Merge cameraResolution setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                cameraSettings: {
                    cameraResolution: CameraResolutions.FULL_HD,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        cameraSettings: {
            ...serverMeta.settings.cameraSettings,
            cameraResolution: CameraResolutions.FULL_HD,
        },
    });
});

test('Merge autosubmit setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                cameraSettings: {
                    autoSubmit: true,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        cameraSettings: {
            ...serverMeta.settings.cameraSettings,
            autoSubmit: true,
        },
    });
});

test('Merge permissionInBrowserTimeout setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                cameraSettings: {
                    permissionInBrowserTimeout: 10_000,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        cameraSettings: {
            ...serverMeta.settings.cameraSettings,
            permissionInBrowserTimeout: 10_000,
        },
    });
});
