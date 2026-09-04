import { FaceBorderSettings } from './face_border_settings';
import { EnabledModule, RetryAttempts } from './stage_settings';

export type LiteMotionControlSettingsBlock = {
    motionControl: MotionControlSettings & EnabledModule;
};

export type MotionControlSettingsBlock = {
    motionControl: MotionControlSettings & EnabledModule & RetryAttempts;
};

export type MotionControlSettings = {
    imagesHints: ImagesHints;
    faceBorder: MotionControlFaceBorderSettings;
    timer: MotionControlTimers;
    patternSettings: PatternSettings;
};

export type PatternSettings = {
    enableSaveFrames: boolean;
    autoGeneration: boolean;
    autoGenerationPatternLength: number;
    autoGenerationPatternActionsList: MotionControlActions[];
    specifiedPatternList: MotionControlActions[][];
};

export enum MotionControlActions {
    LEFT = 'left',
    RIGHT = 'right',
    UP = 'up',
    CLOSER = 'closer',
    FARTHER = 'farther',
}

export type ImagesHints = {
    enabled: boolean;
    resourcesPath: string;
};

export type MotionControlFaceBorderSettings = FaceBorderSettings & {
    patternCoefficients: FaceBorderMotionControlPatternCoefficients;
};

export type FaceBorderMotionControlPatternCoefficients = {
    closer: number;
    farther: number;
};

export type MotionControlTimers = {
    beforeStart: number;
    checkFacePosition: number;
    cancelCheckCommand: number;
    betweenCommand: number;
};

export type MotionControlPatternResult = MotionControlActionResult[];
export type MotionControlActionResult = {
    pattern: MotionControlActions;
    result: boolean;
};
