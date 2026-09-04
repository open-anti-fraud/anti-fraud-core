import { FaceDetectorDelegateMode } from '../const';

export type FaceDetectorSettingsBlock = {
    networksPath: string;
    faceModelSettings: FaceDetectorSettings;
};

export type FaceDetectorSettings = {
    modelEnabled: boolean;
    timeToStartRecord: number;
    angleCalculation: AngleCalculationSettings;
    detectorOptions: DetectorOptions;
    heathcheckImagePath: string;
};

export type AngleCalculationSettings = {
    angles: {
        left: number;
        right: number;
        up: number;
    };
};

export type DetectorOptions = {
    delegate?: FaceDetectorDelegateMode;
    minFaceDetectionConfidence?: number;
};
