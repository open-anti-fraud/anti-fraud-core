import { describe, expect, test } from '../../../../../utils';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

test('Switch enabled', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                motionControl: {
                    enabled: !serverMeta.settings.motionControl.enabled,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        motionControl: {
            ...serverMeta.settings.motionControl,
            enabled: !serverMeta.settings.motionControl.enabled,
        },
    });
});

test('Switch enableSaveFrames', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                motionControl: {
                    patternSettings: {
                        enableSaveFrames: !serverMeta.settings.motionControl.patternSettings.enableSaveFrames,
                    },
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        motionControl: {
            ...serverMeta.settings.motionControl,
            patternSettings: {
                ...serverMeta.settings.motionControl.patternSettings,
                enableSaveFrames: !serverMeta.settings.motionControl.patternSettings.enableSaveFrames,
            },
        },
    });
});

test('Change attemptsCount', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                motionControl: {
                    attemptsCount: 10,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        motionControl: {
            ...serverMeta.settings.motionControl,
            attemptsCount: 10,
        },
    });
});

test('Change order', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                motionControl: {
                    order: 10,
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        motionControl: {
            ...serverMeta.settings.motionControl,
            order: 10,
        },
    });
});

describe('description', () => {
    test('Change enable', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        description: {
                            enabled: false,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                description: {
                    ...serverMeta.settings.motionControl.description,
                    enabled: false,
                },
            },
        });
    });

    describe('autosubmit', () => {
        test('Change enable', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        motionControl: {
                            description: {
                                autoSubmit: {
                                    enabled: true,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    description: {
                        ...serverMeta.settings.motionControl.description,
                        autoSubmit: {
                            ...serverMeta.settings.motionControl.description.autoSubmit,
                            enabled: true,
                        },
                    },
                },
            });
        });

        test('Change timer', async () => {
            expect(
                validator.merge({
                    clientSettings: {
                        ...baseClientConfiguration,
                        motionControl: {
                            description: {
                                autoSubmit: {
                                    timer: 60000,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    description: {
                        ...serverMeta.settings.motionControl.description,
                        autoSubmit: {
                            ...serverMeta.settings.motionControl.description.autoSubmit,
                            timer: 60000,
                        },
                    },
                },
            });
        });
    });
});

describe('faceBorder', () => {
    test('Change faceWidthCoefficients', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
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
            motionControl: {
                ...serverMeta.settings.motionControl,
                faceBorder: {
                    ...serverMeta.settings.motionControl.faceBorder,
                    faceWidthCoefficients: {
                        fullHd: 30,
                        hd: 35,
                        sd: 60,
                    },
                },
            },
        });
    });

    test('Change closer patternCoefficients', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        faceBorder: {
                            patternCoefficients: {
                                closer: 2,
                            },
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                faceBorder: {
                    ...serverMeta.settings.motionControl.faceBorder,
                    patternCoefficients: {
                        ...serverMeta.settings.motionControl.faceBorder.patternCoefficients,
                        closer: 2,
                    },
                },
            },
        });
    });

    test('Change farther patternCoefficients', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        faceBorder: {
                            patternCoefficients: {
                                farther: 0.3,
                            },
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                faceBorder: {
                    ...serverMeta.settings.motionControl.faceBorder,
                    patternCoefficients: {
                        ...serverMeta.settings.motionControl.faceBorder.patternCoefficients,
                        farther: 0.3,
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
                    motionControl: {
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
            motionControl: {
                ...serverMeta.settings.motionControl,
                faceBorder: {
                    ...serverMeta.settings.motionControl.faceBorder,
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
                        motionControl: {
                            faceBorder: {
                                autodetected: {
                                    enabled: !serverMeta.settings.motionControl.faceBorder.autodetected.enabled,
                                },
                            },
                        },
                    },
                    serverSettings: serverMeta.settings,
                })
            ).toEqual({
                ...validConfiguration,
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    faceBorder: {
                        ...serverMeta.settings.motionControl.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.motionControl.faceBorder.autodetected,
                            enabled: !serverMeta.settings.motionControl.faceBorder.autodetected.enabled,
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
                        motionControl: {
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
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    faceBorder: {
                        ...serverMeta.settings.motionControl.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.motionControl.faceBorder.autodetected,
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
                        motionControl: {
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
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    faceBorder: {
                        ...serverMeta.settings.motionControl.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.motionControl.faceBorder.autodetected,
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
                        motionControl: {
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
                motionControl: {
                    ...serverMeta.settings.motionControl,
                    faceBorder: {
                        ...serverMeta.settings.motionControl.faceBorder,
                        autodetected: {
                            ...serverMeta.settings.motionControl.faceBorder.autodetected,
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
                            motionControl: {
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
                    motionControl: {
                        ...serverMeta.settings.motionControl,
                        faceBorder: {
                            ...serverMeta.settings.motionControl.faceBorder,
                            autodetected: {
                                ...serverMeta.settings.motionControl.faceBorder.autodetected,
                                faceSize: {
                                    ...serverMeta.settings.motionControl.faceBorder.autodetected.faceSize,
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
                            motionControl: {
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
                    motionControl: {
                        ...serverMeta.settings.motionControl,
                        faceBorder: {
                            ...serverMeta.settings.motionControl.faceBorder,
                            autodetected: {
                                ...serverMeta.settings.motionControl.faceBorder.autodetected,
                                faceSize: {
                                    ...serverMeta.settings.motionControl.faceBorder.autodetected.faceSize,
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

describe('imagesHints', () => {
    test('Change enable', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        imagesHints: {
                            enabled: !serverMeta.settings.motionControl.imagesHints,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                imagesHints: {
                    ...serverMeta.settings.motionControl.imagesHints,
                    enabled: !serverMeta.settings.motionControl.imagesHints,
                },
            },
        });
    });

    test('Change resourcesPath', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        imagesHints: {
                            resourcesPath: 'resources',
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                imagesHints: {
                    ...serverMeta.settings.motionControl.imagesHints,
                    resourcesPath: 'resources',
                },
            },
        });
    });
});

describe('timer', () => {
    test('Change beforeStart', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        timer: {
                            beforeStart: 10000,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                timer: {
                    ...serverMeta.settings.motionControl.timer,
                    beforeStart: 10000,
                },
            },
        });
    });

    test('Change betweenCommand', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        timer: {
                            betweenCommand: 10000,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                timer: {
                    ...serverMeta.settings.motionControl.timer,
                    betweenCommand: 10000,
                },
            },
        });
    });

    test('Change cancelCheckCommand', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        timer: {
                            cancelCheckCommand: 10000,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                timer: {
                    ...serverMeta.settings.motionControl.timer,
                    cancelCheckCommand: 10000,
                },
            },
        });
    });

    test('Change checkFacePosition', async () => {
        expect(
            validator.merge({
                clientSettings: {
                    ...baseClientConfiguration,
                    motionControl: {
                        timer: {
                            checkFacePosition: 10000,
                        },
                    },
                },
                serverSettings: serverMeta.settings,
            })
        ).toEqual({
            ...validConfiguration,
            motionControl: {
                ...serverMeta.settings.motionControl,
                timer: {
                    ...serverMeta.settings.motionControl.timer,
                    checkFacePosition: 10000,
                },
            },
        });
    });
});
