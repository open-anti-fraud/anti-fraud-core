export enum RequestMessageType {
    START = 0,
    FINISH = 1,
    RESET = 2,
    DATA = 3,
}

export enum ResponseMessageType {
    STRING_MESSAGE = 0,
    EXCEPTION = 2,
}

export enum Inspection {
    MOTION_CONTROL = 1,
    BLANK_VIDEO = 2,
    REFERENCE_FRAMES = 3,
}

export enum ModuleStage {
    NOT_PASSED = 'not passed',
    PASSED = 'passed',
    SAVE = 'saved',
    RESET = 'reset',
}

export enum ModulesName {
    MOTION_CONTROL = 'Motion Control',
}
