import { FaceBorderAutodetectedModeSettings } from '../types/face_border_settings';

export const DEFAULT_FRAME_PADDING = {
    horizontal: 10,
    vertical: 10,
};

export const MIN_FACE_SIZE = {
    width: 120,
    height: 140,
};

export const MAX_FACE_SIZE = {
    width: 360,
    height: 520,
};

export const DEFAULT_FACE_BORDDER_AUTO_DETECTED: FaceBorderAutodetectedModeSettings = {
    enabled: true,
    frameCheckLimit: 60,
    availableDeviation: 20,
    framePadding: DEFAULT_FRAME_PADDING,
    faceSize: {
        min: MIN_FACE_SIZE,
        max: MAX_FACE_SIZE,
    },
};

export const DEFAULLT_ALLOWABLE_ACCURACY_ERROR = {
    x: 20,
    y: 30,
};

export const DEFAULLT_FACE_WIDTH_COEFFICIENTS = {
    fullHd: 20,
    hd: 24,
    sd: 33,
};
