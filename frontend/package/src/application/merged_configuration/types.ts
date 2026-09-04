import {
    ApplicantSettingsBlock,
    AuthenticationSettings,
    BaseSettingsBlock,
    CallbackSettingsBlock,
    CameraSettingsBlock,
    FaceBestshotSettingsBlock,
    FaceDetectorSettingsBlock,
    LiteApplicantSettingsBlock,
    MotionControlSettingsBlock,
    RecursivePartial,
    ServerConnectionSettingsBlock,
} from '../../shared';
import { ComponentSettingsFromServer } from '../server_side_configuration';

export type MergedConfiguration = ComponentSettingsFromServer &
    BaseSettingsBlock &
    RecursivePartial<ApplicantSettingsBlock> &
    RecursivePartial<CallbackSettingsBlock> &
    ServerConnectionSettingsBlock;

export type LiteMergedConfiguration = AuthenticationSettings &
    Omit<BaseSettingsBlock, 'integrationId'> &
    RecursivePartial<LiteApplicantSettingsBlock> &
    FaceDetectorSettingsBlock &
    ServerConnectionSettingsBlock &
    CameraSettingsBlock &
    MotionControlSettingsBlock &
    FaceBestshotSettingsBlock & { externalLink: string };
