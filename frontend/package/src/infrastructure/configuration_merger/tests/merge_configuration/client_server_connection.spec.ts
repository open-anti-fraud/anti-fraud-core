import { expect, test } from '../../../../../utils';
import { VideoRecordingApi } from '../../../../shared';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();


test('Merge videoRecordingApi setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    videoRecordingApi: VideoRecordingApi.WEB_CODEC,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            videoRecordingApi: VideoRecordingApi.WEB_CODEC,
        },
    });
});

test('Merge videoBitrate setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    videoBitrate: 10_000_000,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,

            videoBitrate: 10_000_000,
        },
    });
});

test('Merge idealVideoKeyFrameCountPerSecond setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    idealVideoKeyFrameCountPerSecond: 100,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            idealVideoKeyFrameCountPerSecond: 100,
        },
    });
});

test('Merge requiredReferenceFrameCount setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    requiredReferenceFrameCount: 100,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            requiredReferenceFrameCount: 100,
        },
    });
});

test('Merge referenceFrameQuality setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    referenceFrameQuality: 70,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            referenceFrameQuality: 70,
        },
    });
});

test('Merge switchToMediaRecoderApiAsFallback setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    switchToMediaRecoderApiAsFallback: true,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            switchToMediaRecoderApiAsFallback: true,
        },
    });
});

test('Merge transmissionWaitTimeout setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                clientServerConnectionSettings: {
                    transmissionWaitTimeout: 60_000,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        clientServerConnectionSettings: {
            ...serverMeta.settings.clientServerConnectionSettings,
            transmissionWaitTimeout: 60_000,
        },
    });
});