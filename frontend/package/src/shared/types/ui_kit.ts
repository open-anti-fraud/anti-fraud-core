import { ErrorScreenLayout, FaceBorder, FaceKeypointsMask, MotionControlDirectionHints } from '../../ui';

export type CanvasOptions = {
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
};

export type UIKitSettingsBlock = {
    uiKit: UiKit;
};

export type UiKit = {
    FaceKeypointsMask: new (options?: Partial<CanvasOptions>) => FaceKeypointsMask;
    FaceBorder: new (options?: Partial<CanvasOptions>) => FaceBorder;
    MotionControlDirectionHints: new (options?: Partial<CanvasOptions>) => MotionControlDirectionHints;
    ErrorScreenLayout: new () => ErrorScreenLayout;
};
