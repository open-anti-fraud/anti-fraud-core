import {
    ApplicantSettingsBlock,
    AuthenticationSettings,
    BaseSettingsBlock,
    CallbackSettingsBlock,
    CameraSettingsBlock,
    FaceBestshotSettingsBlock,
    FaceDetectorSettingsBlock,
    FingerprintSettingsBlock,
    LiteApplicantSettingsBlock,
    LiteCallbackSettingsBlock,
    LiteMotionControlSettingsBlock,
    LocalizationSettingsBlock,
    LoggingSettingsBlock,
    MotionControlSettingsBlock,
    RecursivePartial,
    ServerConnectionSettingsBlock,
    UIKitSettingsBlock,
} from '../../shared';

export type ComponentSettingsFromClient = BaseSettingsBlock &
    RecursivePartial<AuthenticationSettings> &
    RecursivePartial<LocalizationSettingsBlock> &
    RecursivePartial<ApplicantSettingsBlock> &
    RecursivePartial<FaceDetectorSettingsBlock> &
    RecursivePartial<CallbackSettingsBlock> &
    RecursivePartial<UIKitSettingsBlock> &
    RecursivePartial<LoggingSettingsBlock> &
    RecursivePartial<ServerConnectionSettingsBlock> &
    RecursivePartial<CameraSettingsBlock> &
    RecursivePartial<MotionControlSettingsBlock> &
    RecursivePartial<FingerprintSettingsBlock> &
    RecursivePartial<FaceBestshotSettingsBlock>;


export type LiteComponentSettingsFromClient = AuthenticationSettings &
    Omit<BaseSettingsBlock, 'integrationId'> &
    RecursivePartial<LiteApplicantSettingsBlock> &
    RecursivePartial<LocalizationSettingsBlock> &
    RecursivePartial<FaceDetectorSettingsBlock> &
    RecursivePartial<LiteCallbackSettingsBlock> &
    RecursivePartial<UIKitSettingsBlock> &
    RecursivePartial<LoggingSettingsBlock> &
    RecursivePartial<ServerConnectionSettingsBlock> &
    RecursivePartial<CameraSettingsBlock> &
    RecursivePartial<LiteMotionControlSettingsBlock> &
    RecursivePartial<FaceBestshotSettingsBlock> & { externalLink: string };
