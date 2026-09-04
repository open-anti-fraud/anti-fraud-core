import { LiteComponentSettingsFromClient, LiteMergedConfiguration } from '../../application';
import {
    CameraSettings,
    ClientServerConnectionSettings,
    deepMergeObjects,
    DEFAULT_CAMERA_SETTINGS,
    DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
    DEFAULT_FACE_BESTSHOT_SETTINGS,
    DEFAULT_FACE_DETECTOR_SETTINGS,
    DEFAULT_LIVENESS_TRANSPORT,
    DEFAULT_MOTION_CONTROL_SETTINGS,
    DEFAULT_NETWORK_PATH,
    EnabledModule,
    FaceBestshotSettings,
    FaceDetectorSettings,
    IConfigurationMerger,
    MotionControlSettings,
    RetryAttempts,
} from '../../shared';

export type MergeProps = {
    clientSettings: LiteComponentSettingsFromClient;
    serverSettings?: undefined;
};

export default class LiteConfigurationMerger implements IConfigurationMerger<LiteMergedConfiguration> {
    public merge({ clientSettings, serverSettings }: MergeProps): LiteMergedConfiguration {
        const secondObject = serverSettings ?? {};

        return {
            ...clientSettings,
            baseUrl: clientSettings.baseUrl === '/' ? '' : clientSettings.baseUrl,
            //  Only client side optional settings
            // Primitive value settings
            networksPath: clientSettings.networksPath ?? DEFAULT_NETWORK_PATH,
            clientServerConnectionSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject,
                defaultValue: DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
                key: 'clientServerConnectionSettings',
            }) as ClientServerConnectionSettings,
            livenessTransport: clientSettings.livenessTransport ?? DEFAULT_LIVENESS_TRANSPORT,
            // Objects value settings
            cameraSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject,
                defaultValue: DEFAULT_CAMERA_SETTINGS,
                key: 'cameraSettings',
            }) as CameraSettings,
            faceModelSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject,
                defaultValue: DEFAULT_FACE_DETECTOR_SETTINGS,
                key: 'faceModelSettings',
            }) as FaceDetectorSettings,
            faceBestshotSettings: deepMergeObjects({
                firstObject: clientSettings,
                secondObject,
                defaultValue: DEFAULT_FACE_BESTSHOT_SETTINGS,
                key: 'faceBestshotSettings',
            }) as FaceBestshotSettings,
            motionControl: deepMergeObjects({
                firstObject: {
                    ...clientSettings,
                    motionControl: {
                        ...clientSettings.motionControl,
                        attemptsCount: 1,
                        order: 1,
                    },
                },
                secondObject,
                defaultValue: DEFAULT_MOTION_CONTROL_SETTINGS,
                key: 'motionControl',
            }) as MotionControlSettings & EnabledModule & RetryAttempts,
        };
    }
}
