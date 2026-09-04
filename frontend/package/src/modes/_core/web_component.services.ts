import { ComponentSettingsFromClient, MergedConfiguration } from '../../application';
import {
    ApplicantDatabaseAPI,
    applicantDatabaseApiFactory,
    AttemptDatabaseAPI,
    attemptDatabaseApiFactory,
    EndeavorDatabaseAPI,
    endeavorDatabaseApiFactory,
} from '../../domain';
import {
    OpenAntiFraudApi,
    openAntiFraudApiFactory,
    BrowserApiSupportChecker,
    browserApiSupportCheckerFactory,
    ConfigurationFromServer,
    configurationFromServerFactory,
    configurationMergerFactory,
    ConfigurationValidator,
    configurationValidatorFactory,
    createLoggingFacade,
    CustomEventsListeners,
    customEventsListenersFactory,
    DEFAULT_LOGGING_SETTINGS,
    Device,
    deviceFactory,
    FaceBestshotSerializator,
    faceBestshotSerializatorFactory,
    FaceDetector,
    faceDetectorFactory,
    FaceDetectorInitiliazer,
    faceDetectorInitiliazerFactory,
    FacePositionValidator,
    facePositionValidatorFactory,
    FaceRotationService,
    faceRotationServiceFactory,
    FaceRotationValidator,
    faceRotationValidatorFactory,
    FaceSizeValidator,
    faceSizeValidatorFactory,
    FingerprintCreator,
    fingerprintCreatorFactory,
    InspectionsTransport,
    InspectionsTransportProps,
    inspectionsWebSocketTransportFactory,
    localizationFactory,
    LocalizationService,
    LoggingServiceFacade,
    NormalizationCalculator,
    normalizationCalculatorFactory,
    UUIDGenerator,
    uuidGeneratorFactory,
    VersionCompatibilityValidator,
    versionCompatibilityValidatorFactory,
    VideoStreamRequester,
    videoStreamRequesterFactory,
    VideoStreamsMetadataRequester,
    videoStreamsMetadataRequesterFactory,
} from '../../infrastructure';
import { ProcessingVideoStream, processingVideoStreamsFactory } from '../../infrastructure/processing_video_stream';

import {
    CameraSettings,
    deepMergeObjects,
    FaceDetectorSettings,
    IConfigurationMerger,
    LocalizedMessages,
    LoggingSettings,
} from '../../shared';

export default class Services {
    openAntiFraudApi?: OpenAntiFraudApi;
    applicantDatabaseApi?: ApplicantDatabaseAPI;
    endeavorDatabaseApi?: EndeavorDatabaseAPI;
    attemptDatabaseApi?: AttemptDatabaseAPI;
    browserSupportApiChecker?: BrowserApiSupportChecker;
    configurationFromServerFetcher?: ConfigurationFromServer;
    configurationMerger?: IConfigurationMerger<object>;
    configurationValidator?: ConfigurationValidator;
    customEventsListeners?: CustomEventsListeners;
    device?: Device;
    faceBestshotSerializator?: FaceBestshotSerializator;
    faceDetector?: FaceDetector;
    facePositionValidator?: FacePositionValidator;
    faceRotationValidator?: FaceRotationValidator;
    faceRotationService?: FaceRotationService;
    faceSizeValidator?: FaceSizeValidator;
    faceDetectorInitiliazer?: typeof FaceDetectorInitiliazer;
    fingerprintCreator?: FingerprintCreator;
    logger?: LoggingServiceFacade;
    localizator?: LocalizationService;
    inspectionTransport?: InspectionsTransport;
    normalizationCalculator?: NormalizationCalculator;
    processingVideoStream?: ProcessingVideoStream;
    videoStreamRequester?: VideoStreamRequester;
    videoStreamsMetadataRequester?: VideoStreamsMetadataRequester;
    versionCompatibilityValidator?: VersionCompatibilityValidator;
    uuidGenerator?: UUIDGenerator;

    constructor(clientSideConfiguration: ComponentSettingsFromClient) {
        this.initLocalizationService(clientSideConfiguration);

        this.browserSupportApiChecker = browserApiSupportCheckerFactory();

        this.configurationFromServerFetcher = configurationFromServerFactory();
        this.configurationMerger = configurationMergerFactory();
        this.configurationValidator = configurationValidatorFactory();
        this.customEventsListeners = customEventsListenersFactory();

        this.device = deviceFactory();

        this.facePositionValidator = facePositionValidatorFactory();
        this.faceRotationValidator = faceRotationValidatorFactory();
        this.faceSizeValidator = faceSizeValidatorFactory();
        this.faceRotationService = faceRotationServiceFactory();
        this.faceBestshotSerializator = faceBestshotSerializatorFactory();
        this.fingerprintCreator = fingerprintCreatorFactory();

        this.normalizationCalculator = normalizationCalculatorFactory();

        this.processingVideoStream = processingVideoStreamsFactory();

        this.versionCompatibilityValidator = versionCompatibilityValidatorFactory();
        this.videoStreamsMetadataRequester = videoStreamsMetadataRequesterFactory();

        this.uuidGenerator = uuidGeneratorFactory();
    }

    public initLocalizationService(clientSideConfiguration: ComponentSettingsFromClient) {
        this.localizator = localizationFactory({
            lang: clientSideConfiguration.language,
            localizatedMessages: clientSideConfiguration.locales as LocalizedMessages,
        });
    }

    public initLoggingService(clientSideConfiguration: ComponentSettingsFromClient, correlationId: string) {
        const logginSettings = deepMergeObjects({
            firstObject: clientSideConfiguration,
            secondObject: {},
            defaultValue: DEFAULT_LOGGING_SETTINGS,
            key: 'loggingSettings',
        }) as LoggingSettings;

        if (!logginSettings.enabled) return;

        const { integrationId, baseUrl, applicantId } = clientSideConfiguration;
        let fallbackInterval = logginSettings.fallbackInterval ?? 3_000;
        fallbackInterval = Math.max(0, fallbackInterval);

        this.logger = createLoggingFacade(
            logginSettings.output,
            { integrationId, baseUrl, correlationId, authenticationToken: clientSideConfiguration.authenticationToken },
            {
                integrationId,
                applicantId,
                attemptId: undefined,
                deviceId: undefined,
                endeavorId: undefined,
            },
            logginSettings.level,
            fallbackInterval
        );
    }

    public initOpenAntiFraudApi(mergedConfiguration: MergedConfiguration, correlationId: string, authenticationToken: string) {
        this.openAntiFraudApi = openAntiFraudApiFactory({ ...mergedConfiguration, authenticationToken, correlationId: correlationId! });
        this.applicantDatabaseApi = applicantDatabaseApiFactory(this.openAntiFraudApi);
        this.endeavorDatabaseApi = endeavorDatabaseApiFactory(this.openAntiFraudApi);
        this.attemptDatabaseApi = attemptDatabaseApiFactory(this.openAntiFraudApi);
    }

    public initVideoStream(cameraSettings: CameraSettings) {
        this.videoStreamRequester = videoStreamRequesterFactory({
            permissionInBrowserTimeout: cameraSettings.permissionInBrowserTimeout,
            preferCameraId: cameraSettings.cameraId,
            preferCameraResolution: cameraSettings.cameraResolution,
        });
    }

    public initFaceDetectionService(settings: FaceDetectorSettings) {
        if (!settings.modelEnabled) return;
        //@ts-ignore
        this.faceDetectorInitiliazer = faceDetectorInitiliazerFactory();
        this.faceDetector = faceDetectorFactory();
    }

    public initInspectionTransport(data: InspectionsTransportProps) {
        this.inspectionTransport = inspectionsWebSocketTransportFactory(data);
    }

    public async destroy() {
        await this.logger?.flush();
        this.logger?.destroy();
        this.logger = undefined;

        this.localizator = undefined!;

        this.browserSupportApiChecker = undefined;

        this.configurationFromServerFetcher = undefined;
        this.configurationMerger = undefined;
        this.configurationValidator = undefined;

        this.customEventsListeners?.removeAllListeners();
        this.customEventsListeners = undefined;

        this.device = undefined;

        this.faceDetector = undefined;
        await this.faceDetectorInitiliazer?.destroy();
        this.faceDetectorInitiliazer = undefined;

        this.facePositionValidator = undefined;
        this.faceRotationValidator = undefined;
        this.faceSizeValidator = undefined;
        this.faceRotationService = undefined;
        this.faceBestshotSerializator = undefined;
        this.fingerprintCreator = undefined;

        this.normalizationCalculator = undefined;

        await this.processingVideoStream?.destroy();
        this.processingVideoStream = undefined;

        this.versionCompatibilityValidator = undefined;
        this.videoStreamsMetadataRequester = undefined;

        this.uuidGenerator = undefined;
    }
}
