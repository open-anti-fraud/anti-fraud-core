import { ComponentSettingsFromClient, ComponentSettingsFromServer, MergedConfiguration } from '../../application';
import {
    ApplicantFields,
    CameraSettings,
    ClientServerConnectionSettings,
    deepMergeObjects,
    DEFAULT_APPLICANT_FIELDS,
    DEFAULT_CAMERA_SETTINGS,
    DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
    DEFAULT_FACE_BESTSHOT_SETTINGS,
    DEFAULT_FACE_DETECTOR_SETTINGS,
    DEFAULT_FINGERPRINT_WAIT_TIME,
    DEFAULT_LIVENESS_TRANSPORT,
    DEFAULT_MOTION_CONTROL_SETTINGS,
    DEFAULT_NETWORK_PATH,
    DISABLED_APPLICANT_FIELDS,
    EnabledModule,
    FaceBestshotSettings,
    FaceDetectorSettings,
    IConfigurationMerger,
    MotionControlSettings,
    RetryAttempts,
} from '../../shared';

export type MergeProps = {
    clientSettings: ComponentSettingsFromClient;
    serverSettings: ComponentSettingsFromServer;
};

export default class ConfigurationMerger implements IConfigurationMerger<MergedConfiguration> {
    public merge({ clientSettings, serverSettings }: MergeProps): MergedConfiguration {
        return {
            ...serverSettings,
            // Only client side required client settings
            integrationId: clientSettings.integrationId,
            mountElement: clientSettings.mountElement,
            baseUrl: clientSettings.baseUrl === '/' ? '' : clientSettings.baseUrl,
            //  Only client side optional settings
            callbacks: clientSettings.callbacks,
            applicantId: clientSettings.applicantId,
            // Only server side settings
            videoRecorderToken: serverSettings.videoRecorderToken,
            videoRecorderDecryptionKey: serverSettings.videoRecorderDecryptionKey,
            // Primitive value settings
            networksPath: clientSettings.networksPath ?? serverSettings.networksPath ?? DEFAULT_NETWORK_PATH,
            clientServerConnectionSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject: serverSettings,
                defaultValue: DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
                key: 'clientServerConnectionSettings',
            }) as ClientServerConnectionSettings,
            livenessTransport:
                clientSettings.livenessTransport ?? serverSettings.livenessTransport ?? DEFAULT_LIVENESS_TRANSPORT,
            fingerprintWaitTime:
                clientSettings.fingerprintWaitTime ??
                serverSettings.fingerprintWaitTime ??
                DEFAULT_FINGERPRINT_WAIT_TIME,
            // Objects value settings
            applicantFields: clientSettings.applicantId
                ? DISABLED_APPLICANT_FIELDS
                : (deepMergeObjects({
                      firstObject: clientSettings,
                      secondObject: serverSettings,
                      defaultValue: DEFAULT_APPLICANT_FIELDS,
                      key: 'applicantFields',
                  }) as ApplicantFields),
            cameraSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject: serverSettings,
                defaultValue: DEFAULT_CAMERA_SETTINGS,
                key: 'cameraSettings',
            }) as CameraSettings,
            faceModelSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject: serverSettings,
                defaultValue: DEFAULT_FACE_DETECTOR_SETTINGS,
                key: 'faceModelSettings',
            }) as FaceDetectorSettings,
            faceBestshotSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject: serverSettings,
                defaultValue: DEFAULT_FACE_BESTSHOT_SETTINGS,
                key: 'faceBestshotSettings',
            }) as FaceBestshotSettings,
            motionControl: deepMergeObjects({
                firstObject: clientSettings,
                secondObject: serverSettings,
                defaultValue: DEFAULT_MOTION_CONTROL_SETTINGS,
                key: 'motionControl',
            }) as MotionControlSettings & EnabledModule & RetryAttempts,
        };
    }
}
