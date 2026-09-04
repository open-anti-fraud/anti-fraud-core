import { describe, expect, test } from '../../../../../utils';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

describe('faceBorder', () => {
    test('Change faceWidthCoefficients', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    faceBestshotSettings: {
                        faceBorder: {
                            faceWidthCoefficients: {
                                fullHd: 30,
                                hd: 35,
                                sd: 60,
                            },
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            faceBestshotSettings: {
                ...serverMeta.settings.faceBestshotSettings,
                faceBorder: {
                    ...serverMeta.settings.faceBestshotSettings.faceBorder,
                    faceWidthCoefficients: {
                        fullHd: 30,
                        hd: 35,
                        sd: 60,
                    },
                },
            },
        });
    });

    test('Change allowableAccuracyError', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    faceBestshotSettings: {
                        faceBorder: {
                            allowableAccuracyError: {
                                x: 50,
                                y: 50,
                            },
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            faceBestshotSettings: {
                ...serverMeta.settings.faceBestshotSettings,
                faceBorder: {
                    ...serverMeta.settings.faceBestshotSettings.faceBorder,
                    allowableAccuracyError: {
                        x: 50,
                        y: 50,
                    },
                },
            },
        });
    });

    describe('autodetected', () => {
        test('Change enable', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceBestshotSettings: {
                            faceBorder: {
                                autodetected: {
                                    enabled: !serverMeta.settings.faceBestshotSettings.faceBorder.autodetected.enabled,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceBestshotSettings: {
                    ...serverMeta.settings.faceBestshotSettings,
                    faceBorder: {
                        ...serverMeta.settings.faceBestshotSettings.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                            enabled: !serverMeta.settings.faceBestshotSettings.faceBorder.autodetected.enabled,
                        },
                    },
                },
            });
        });

        test('Change availableDeviation', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceBestshotSettings: {
                            faceBorder: {
                                autodetected: {
                                    availableDeviation: 30,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceBestshotSettings: {
                    ...serverMeta.settings.faceBestshotSettings,
                    faceBorder: {
                        ...serverMeta.settings.faceBestshotSettings.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                            availableDeviation: 30,
                        },
                    },
                },
            });
        });

        test('Change frameCheckLimit', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceBestshotSettings: {
                            faceBorder: {
                                autodetected: {
                                    frameCheckLimit: 30,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceBestshotSettings: {
                    ...serverMeta.settings.faceBestshotSettings,
                    faceBorder: {
                        ...serverMeta.settings.faceBestshotSettings.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                            frameCheckLimit: 30,
                        },
                    },
                },
            });
        });

        test('Change framePadding', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        faceBestshotSettings: {
                            faceBorder: {
                                autodetected: {
                                    framePadding: {
                                        horizontal: 30,
                                        vertical: 30,
                                    },
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                faceBestshotSettings: {
                    ...serverMeta.settings.faceBestshotSettings,
                    faceBorder: {
                        ...serverMeta.settings.faceBestshotSettings.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                            framePadding: {
                                horizontal: 30,
                                vertical: 30,
                            },
                        },
                    },
                },
            });
        });

        describe('faceSize', () => {
            test('Change min', async () => {
                expect(
                    validator.merge({
                        clientSettings: {
                            ...baseClientConfiguration,
                            faceBestshotSettings: {
                                faceBorder: {
                                    autodetected: {
                                        faceSize: {
                                            min: {
                                                height: 10,
                                                width: 10,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        serverSettings: serverMeta.settings,
                    })
                ).toEqual({
                    ...validConfiguration,
                    faceBestshotSettings: {
                        ...serverMeta.settings.faceBestshotSettings,
                        faceBorder: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder,
                            autodetected: {
                                ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                                faceSize: {
                                    ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected.faceSize,
                                    min: {
                                        height: 10,
                                        width: 10,
                                    },
                                },
                            },
                        },
                    },
                });
            });

            test('Change max', async () => {
                expect(
                    validator.merge({
                        clientSettings: {
                            ...baseClientConfiguration,
                            faceBestshotSettings: {
                                faceBorder: {
                                    autodetected: {
                                        faceSize: {
                                            max: {
                                                height: 10,
                                                width: 10,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        serverSettings: serverMeta.settings,
                    })
                ).toEqual({
                    ...validConfiguration,
                    faceBestshotSettings: {
                        ...serverMeta.settings.faceBestshotSettings,
                        faceBorder: {
                            ...serverMeta.settings.faceBestshotSettings.faceBorder,
                            autodetected: {
                                ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected,
                                faceSize: {
                                    ...serverMeta.settings.faceBestshotSettings.faceBorder.autodetected.faceSize,
                                    max: {
                                        height: 10,
                                        width: 10,
                                    },
                                },
                            },
                        },
                    },
                });
            });
        });
    });
});
