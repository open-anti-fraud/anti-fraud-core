import { Resolution } from "./resolution";

export type CameraSettingsBlock = {
    cameraSettings: CameraSettings;
};

export type CameraSettings = {
    cameraResolution: CameraResolutions;
    cameraId?: string;
    autoSubmit: boolean;
    permissionInBrowserTimeout?: number;
};

export enum CameraResolutions {
    FULL_HD = 'fhd',
    HD = 'hd',
    SD = 'sd',
}

export type FaceSize = {
    width: number;
    height: number;
};

export type CameraResolutionDimensions = {
    [CameraResolutions.FULL_HD]: Resolution;
    [CameraResolutions.HD]: Resolution;
    [CameraResolutions.SD]: Resolution;
};
