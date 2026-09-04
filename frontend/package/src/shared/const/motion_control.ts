import { EnabledModule, MotionControlActions, MotionControlSettings, RetryAttempts } from '../types';
import {
    DEFAULLT_ALLOWABLE_ACCURACY_ERROR,
    DEFAULLT_FACE_WIDTH_COEFFICIENTS,
    DEFAULT_FACE_BORDDER_AUTO_DETECTED,
} from './face_border';

export const DEFAULT_MOTION_CONTROL_SETTINGS: MotionControlSettings & EnabledModule & RetryAttempts = {
    order: 1,
    enabled: true,
    attemptsCount: 3,

    imagesHints: {
        enabled: false,
        resourcesPath: '/images/motion_control_gif_hints/',
    },

    description: {
        enabled: true,
        autoSubmit: {
            enabled: false,
            timer: 30000,
        },
    },

    faceBorder: {
        autodetected: DEFAULT_FACE_BORDDER_AUTO_DETECTED,
        allowableAccuracyError: DEFAULLT_ALLOWABLE_ACCURACY_ERROR,
        faceWidthCoefficients: DEFAULLT_FACE_WIDTH_COEFFICIENTS,
        patternCoefficients: {
            closer: 1.2,
            farther: 0.8,
        },
    },

    timer: {
        beforeStart: 1000,
        betweenCommand: 250,
        cancelCheckCommand: 5000,
        checkFacePosition: 250,
    },

    patternSettings: {
        enableSaveFrames: false,
        autoGeneration: true,
        autoGenerationPatternActionsList: [MotionControlActions.LEFT, MotionControlActions.RIGHT],
        autoGenerationPatternLength: 3,
        specifiedPatternList: [
            [MotionControlActions.LEFT, MotionControlActions.RIGHT],
            [MotionControlActions.RIGHT, MotionControlActions.LEFT],
        ],
    },
};

export enum VideoContainer {
    MP4 = 0,
    WEBM = 1,
}

export enum VideoCodec {
    VP8 = 0,
    VP9 = 1,
    H264 = 2,
}
