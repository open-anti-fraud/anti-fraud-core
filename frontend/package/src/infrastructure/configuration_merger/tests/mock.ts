import {
    ComponentMetaFromServer,
    ComponentSettingsFromClient,
    ComponentSettingsFromServer,
} from '../../../application';
import {
    DEFAULT_APPLICANT_FIELDS,
    DEFAULT_CAMERA_SETTINGS,
    DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
    DEFAULT_FACE_BESTSHOT_SETTINGS,
    DEFAULT_FACE_DETECTOR_SETTINGS,
    DEFAULT_FINGERPRINT_WAIT_TIME,
    DEFAULT_LIVENESS_TRANSPORT,
    DEFAULT_MOTION_CONTROL_SETTINGS,
    DEFAULT_NETWORK_PATH,
} from '../../../shared';
// Mocks of Business Logic Config

export const baseClientConfiguration: ComponentSettingsFromClient = {
    integrationId: '28608d66-a571-44ec-94db-04a00143ff51',
    baseUrl: '/',
    mountElement: 'app',
};

export const serverMeta: ComponentMetaFromServer = {
    integrationId: '28608d66-a571-44ec-94db-04a00143ff51',
    domain: 'https://localhost:5174',
    description: '',
    active: true,
    settings: {
        accountId: '28608d66-a571-44ec-94db-04a00143ff51',
        videoRecorderToken: 'da9daf24-a4ca-4d15-a915-2a8d8ffe62d8',
        videoRecorderDecryptionKey: 'jCua__B_oLfT3asXc7yKinPlbVcyMCdungtVqSZkeOc=',
        faceModelSettings: DEFAULT_FACE_DETECTOR_SETTINGS,
        cameraSettings: {
            cameraResolution: DEFAULT_CAMERA_SETTINGS.cameraResolution,
            autoSubmit: DEFAULT_CAMERA_SETTINGS.autoSubmit,
            permissionInBrowserTimeout: 30_000,
        },
        clientServerConnectionSettings: DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
        motionControl: DEFAULT_MOTION_CONTROL_SETTINGS,
        applicantFields: DEFAULT_APPLICANT_FIELDS,
        livenessTransport: DEFAULT_LIVENESS_TRANSPORT,
        fingerprintWaitTime: DEFAULT_FINGERPRINT_WAIT_TIME,
        networksPath: DEFAULT_NETWORK_PATH,
        faceBestshotSettings: DEFAULT_FACE_BESTSHOT_SETTINGS,
    },
};

export const validConfiguration: ComponentSettingsFromServer & ComponentSettingsFromClient = {
    integrationId: '28608d66-a571-44ec-94db-04a00143ff51',
    mountElement: 'app',
    baseUrl: '',
    accountId: '28608d66-a571-44ec-94db-04a00143ff51',
    videoRecorderToken: 'da9daf24-a4ca-4d15-a915-2a8d8ffe62d8',
    videoRecorderDecryptionKey: 'jCua__B_oLfT3asXc7yKinPlbVcyMCdungtVqSZkeOc=',
    faceModelSettings: DEFAULT_FACE_DETECTOR_SETTINGS,
    cameraSettings: DEFAULT_CAMERA_SETTINGS,
    motionControl: DEFAULT_MOTION_CONTROL_SETTINGS,
    applicantFields: DEFAULT_APPLICANT_FIELDS,
    faceBestshotSettings: DEFAULT_FACE_BESTSHOT_SETTINGS,
    livenessTransport: DEFAULT_LIVENESS_TRANSPORT,
    fingerprintWaitTime: DEFAULT_FINGERPRINT_WAIT_TIME,
    clientServerConnectionSettings: DEFAULT_CLIENT_SERVER_CONNECTION_SETTINGS,
    applicantId: undefined,
    callbacks: undefined,
    networksPath: DEFAULT_NETWORK_PATH,
};