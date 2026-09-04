import { Resolution } from './resolution';

export type FaceBorderSettings = {
    allowableAccuracyError: FaceBorderAllowableAccuracyError;
    faceWidthCoefficients: FaceWidthCoefficients;
    autodetected: FaceBorderAutodetectedModeSettings;
};

export type FaceWidthCoefficients = {
    fullHd: number;
    hd: number;
    sd: number;
};

export type FaceBorderAllowableAccuracyError = {
    x: number;
    y: number;
};

export type FaceBorderAutodetectedModeSettings = {
    enabled: boolean;
    frameCheckLimit: number;
    availableDeviation: number;
    framePadding: {
        horizontal: number;
        vertical: number;
    };
    faceSize: {
        min: Resolution;
        max: Resolution;
    };
};
