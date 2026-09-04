import { describe, expect, test } from '../../../../../utils';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

test('Merge modelEnabled setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                faceModelSettings: {
                    modelEnabled: !serverMeta.settings.faceModelSettings.modelEnabled,
                },
            },
            serverSettings: {
                ...serverMeta.settings,
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    enabled: false,
                },
            },
        })
    ).toEqual({
        ...validConfiguration,
        motionControl: {
            ...serverMeta.settings.motionControl,
            enabled: false,
        },
        faceModelSettings: {
            ...serverMeta.settings.faceModelSettings,
            modelEnabled: !serverMeta.settings.faceModelSettings.modelEnabled,
        },
    });
});

test('Merge timeToStartRecord setting', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                faceModelSettings: {
                    timeToStartRecord: 10000,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        faceModelSettings: {
            ...serverMeta.settings.faceModelSettings,
            timeToStartRecord: 10000,
        },
    });
});

describe('Merge angleCalculation settings', () => {
    describe('Merge angles settings', () => {
        test('Merge left setting', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceModelSettings: {
                            angleCalculation: {
                                angles: {
                                    left: 100
                                }
                            }
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceModelSettings: {
                    ...serverMeta.settings.faceModelSettings,
                    angleCalculation: {
                        ...serverMeta.settings.faceModelSettings.angleCalculation,
                        angles: {
                            ...serverMeta.settings.faceModelSettings.angleCalculation.angles,
                            left: 100,
                        },
                    },
                },
            });
        });

        test('Merge right setting', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceModelSettings: {
                            angleCalculation: {
                                angles: {
                                    right: 100,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceModelSettings: {
                    ...serverMeta.settings.faceModelSettings,
                    angleCalculation: {
                        ...serverMeta.settings.faceModelSettings.angleCalculation,
                        angles: {
                            ...serverMeta.settings.faceModelSettings.angleCalculation.angles,
                            right: 100,
                        },
                    },
                },
            });
        });

        test('Merge up setting', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceModelSettings: {
                            angleCalculation: {
                                angles: {
                                    up: 100,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceModelSettings: {
                    ...serverMeta.settings.faceModelSettings,
                    angleCalculation: {
                        ...serverMeta.settings.faceModelSettings.angleCalculation,
                        angles: {
                            ...serverMeta.settings.faceModelSettings.angleCalculation.angles,
                            up: 100,
                        },
                    },
                },
            });
        });
    });
});
