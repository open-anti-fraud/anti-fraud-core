import { ComponentSettingsFromClient, LiteComponentSettingsFromClient } from './application';
import { FaceDetectorInitiliazer, LocalizationMessages } from './infrastructure';
import { IWebComponent, TDVAthorizationOnboarding, TDVLiteOnboarding, TDVRegistrationOnboarding } from './modes';
import {
    BoundingBox,
    CameraResolutions,
    FaceDetectorDelegateMode,
    LiteValidationResult,
    LivenessTransport,
    LoggingOutput,
    LogLevel,
    MotionControlActions,
    MotionControlPattern,
    Point,
    Resolution,
    ValidationResult,
    VideoRecordingApi,
} from './shared';
import {
    ArrowsMotionControlDirectionHints,
    DEFAULT_FACE_BORDER_OPTIONS,
    DEFAULT_FACE_KEYPOINTS_MASK_OPTIONS,
    DEFAULT_MOTION_CONTROL_DIRECTION_HINTS_OPTIONS,
    EllipseFaceBorder,
    ErrorScreenLayout,
    FaceBorder,
    FaceKeypointsMask,
    MotionControlDirectionHints,
    RoundedSquareFaceBorder,
} from './ui';

export default {
    Register: TDVRegistrationOnboarding,
    Authorization: TDVAthorizationOnboarding,
    TensorflowFaceDetector: FaceDetectorInitiliazer,
    Lite: TDVLiteOnboarding,
    DefaultLocales: LocalizationMessages,
    CameraResolutions,
    LivenessTransport,
    MotionControlActions,
    VideoRecordingApi,
    FaceDetectorDelegateMode,
    LogLevel,
    LoggingOutput,
    UiKit: {
        FaceKeypointsMask,
        FaceBorder,
        RoundedSquareFaceBorder,
        EllipseFaceBorder,
        MotionControlDirectionHints,
        ArrowsMotionControlDirectionHints,
        ErrorScreenLayout,
        DEFAULT_FACE_BORDER_OPTIONS,
        DEFAULT_FACE_KEYPOINTS_MASK_OPTIONS,
        DEFAULT_MOTION_CONTROL_DIRECTION_HINTS_OPTIONS,
    },
};

export type {
    BoundingBox,
    ComponentSettingsFromClient,
    IWebComponent,
    LiteComponentSettingsFromClient, LiteValidationResult, MotionControlPattern,
    Point,
    Resolution,
    TDVAthorizationOnboarding,
    TDVLiteOnboarding,
    TDVRegistrationOnboarding,
    ValidationResult
};

