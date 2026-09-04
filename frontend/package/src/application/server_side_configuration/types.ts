import {
    ApplicantSettingsBlock,
    CameraSettingsBlock,
    FaceBestshotSettingsBlock,
    FaceDetectorSettingsBlock,
    FingerprintSettingsBlock,
    MotionControlSettingsBlock,
    ServerConnectionSettingsBlock,
    VideoRecodingSettingsBlock,
} from '../../shared';

export type ComponentMetaFromServer = {
    integrationId: string;
    domain: string;
    description: string;
    active: true;
    settings: ComponentSettingsFromServer;
};

export type ComponentSettingsFromServer = Omit<ApplicantSettingsBlock, 'applicantId'> &
    VideoRecodingSettingsBlock &
    FaceDetectorSettingsBlock &
    ServerConnectionSettingsBlock &
    CameraSettingsBlock &
    MotionControlSettingsBlock &
    FingerprintSettingsBlock &
    FaceBestshotSettingsBlock & {
        accountId: string;
    };
