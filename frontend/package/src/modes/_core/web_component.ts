import { ComponentSettingsFromClient } from '../../application';
import {
    FlowMode,
    onGetReferenceImagesCallback,
    onMotionCallback,
    onStartValidationCallback,
    serializeObject,
    UiKit,
    WebComponentError,
} from '../../shared';

import Model from './web_component.model';
import Services from './web_component.services';
import View from './web_component.view';

import {
    calculateNormalizationCoefficients,
    callCallback,
    callOnMountedCallback,
    checkSupportHardwareAcceleration,
    checkSupportRequiredApi,
    checkVersionCompatibility,
    consoleLogComponentVersion,
    fetchConfigurationFromServer,
    generateCorrelationId,
    generateSessionId,
    getCurrentStageLocalizatedName,
    getLocalizatedErrorMessage,
    handleBestshot,
    identifyApplicantStatus,
    identifyFacePositionStage,
    initFaceDetector,
    initProcessingVideoStream,
    loadOrCreateDeviceUUID,
    logClientSideConfiguration,
    logComponentMode,
    logComponentVersion,
    logDeviceUserAgent,
    logDeviceUUID,
    logLocation,
    mergeConfigurations,
    motionControl,
    prepareConnection,
    prepareViewForBiometricInspection,
    removeViewForBiometricInspection,
    renderPageHeading,
    renderPrepareEnvironmentPreloader,
    renderSessionUUID,
    runBiometricSerivces,
    selectCamera,
    setAverageFaceDetectionTime,
    showDescription,
    startHandleErrorEvent,
    stopBiometricSerivces,
    stopHandleErrorEvent,
    stopLogDetection,
    stopLogVideoFrame,
    takeBestshots,
    validateClientSideConfiguration,
    validateFlowResult,
    validateMergedConfiguration,
    waitWhileReadyForBiometricInspection,
} from './helpers';

export type WebComponentProps = {
    mode: FlowMode;
    configurationFromClient: ComponentSettingsFromClient;
};

export interface IWebComponent {
    destroy(): Promise<void>;
}

export default abstract class WebComponent implements IWebComponent {
    private _view: View;
    private _model: Model;
    private _services: Services;

    constructor(props: WebComponentProps) {
        consoleLogComponentVersion();

        this._model = new Model(props.mode, props.configurationFromClient);
        this._view = new View(
            this._model.clientSideConfiguration.mountElement,
            this._model.clientSideConfiguration.uiKit as UiKit
        );
        this._services = new Services(this._model.clientSideConfiguration);

        const { uuidGenerator, device, customEventsListeners } = this._services;

        generateSessionId<Model>(this._model, uuidGenerator!);
        renderSessionUUID(this._view.sessionIdHint, this._model.sessionId!);

        generateCorrelationId<Model>(this._model, this._model.clientSideConfiguration.loggingSettings?.correlationId);
        this._services.initLoggingService(this._model.clientSideConfiguration, this._model.correlationId!);

        const { logger } = this._services;
        loadOrCreateDeviceUUID<Model>(this._model, device!, uuidGenerator!, logger!);

        logDeviceUUID(this._model.deviceUUID!, logger);
        logComponentVersion(logger);
        logDeviceUserAgent(device!, logger);
        logLocation(logger);
        logComponentMode(this._model.mode, logger);
        logClientSideConfiguration(this._model.clientSideConfiguration);

        startHandleErrorEvent(this._model.flow, customEventsListeners!, this._handleError.bind(this));
        this._init();
    }

    private async _handleError(error: Error) {
        const { processingVideoStream, faceDetector, customEventsListeners, logger, inspectionTransport, localizator } =
            this._services;
        logger?.addDebugLog(`Handle stage error starting`);

        await stopBiometricSerivces(processingVideoStream, faceDetector, customEventsListeners, logger);

        this._view.removePreloader();
        this._view.relativeContainer.root.remove();
        this._view.textHints.root.remove();

        if (inspectionTransport?.isOpenConnection()) {
            logger?.addDebugLog('Close connection');
            inspectionTransport?.closeConnection();
        }

        const { callbacks } = this._model.clientSideConfiguration;
        const tryAgainFn = this._init.bind(this);

        const stageName = this._model.flow.stage?.name;
        const localizationStageName = getCurrentStageLocalizatedName(stageName);
        logger?.addDebugLog(`Current stage name: ${stageName}, localization stage name: ${localizationStageName}`);

        await this._model.flow.stage?.destroy();
        await this._model.destroy();

        if ((error as Error).message === 'Back') {
            logger?.addDebugLog(`Go back from current stage`);
            callCallback(callbacks?.onBack, [], logger);
            if (tryAgainFn) tryAgainFn();
            return;
        }

        logger?.addCriticalErrorLog(`Name: ${error.name}, message:${error.message}`);

        const webComponentError =
            error instanceof WebComponentError ? error : new WebComponentError({ message: error.message });
        const message = getLocalizatedErrorMessage(
            localizator!,
            webComponentError,
            `Stages.${localizationStageName}.Errors`
        );

        logger?.addCriticalErrorLog(message);

        callCallback(callbacks?.onError, [webComponentError.message, webComponentError.code], logger);
        this._view.showError(message);

        const buttonText = localizator?.getLocalizedMessageByKey('ErrorScreen.TryAgainButton');
        this._view.setTryAgainButtonText(buttonText);
        this._view.onClickTryAgainButton(async () => {
            this._view.removeErrorScreen();
            callCallback(callbacks?.onUpdate, [], logger);
            if (tryAgainFn) tryAgainFn();
        });
        this._view.showTryAgainButton();

        this._view.removePreloader();
        await logger?.flush();

        logger?.addDebugLog(`Handle stage error has been finished`);
    }

    private async _init() {
        try {
            const {
                device,
                browserSupportApiChecker,
                versionCompatibilityValidator,
                processingVideoStream,
                logger,
                localizator,
            } = this._services;
            const { mode, clientSideConfiguration, correlationId } = this._model;
            const { authenticationToken } = clientSideConfiguration;

            this._model.flow.error = undefined;

            renderPageHeading(this._view, mode, localizator);
            renderPrepareEnvironmentPreloader(this._view, localizator);

            await checkVersionCompatibility(this._model, versionCompatibilityValidator!, logger);
            checkSupportRequiredApi(browserSupportApiChecker!, logger);
            validateClientSideConfiguration(clientSideConfiguration, this._services.configurationValidator!, logger);

            await fetchConfigurationFromServer(this._model, this._services.configurationFromServerFetcher!, logger);
            mergeConfigurations(this._model, this._services.configurationMerger!, logger);
            validateMergedConfiguration(this._model, this._services.configurationValidator!, logger);

            const { mergedConfiguration } = this._model;
            const { networksPath, faceModelSettings } = this._model.mergedConfiguration;
            if (faceModelSettings.modelEnabled)
                checkSupportHardwareAcceleration(device!, browserSupportApiChecker!, logger);

            this._services.initOpenAntiFraudApi(mergedConfiguration, correlationId!, authenticationToken ?? '');
            this._services.initVideoStream(mergedConfiguration.cameraSettings);
            this._services.initFaceDetectionService(mergedConfiguration.faceModelSettings);
            await initProcessingVideoStream(processingVideoStream, logger);

            const promises = [this._run()];
            if (faceModelSettings.modelEnabled)
                promises.push(
                    initFaceDetector(this._services.faceDetectorInitiliazer, networksPath, faceModelSettings, logger)
                );
            await Promise.all(promises);
        } catch (err) {
            if (!!this._model.flow.error) return;
            this._model.flow.error = err as Error;
            this._handleError(this._model.flow.error);
        }
    }

    private async _run() {
        const { processingVideoStream, faceDetector, customEventsListeners, logger, normalizationCalculator } =
            this._services;

        callOnMountedCallback(this._model.flow, this._model.clientSideConfiguration.callbacks?.onMounted, logger);

        await identifyApplicantStatus(this._model, this._view, this._services);
        await selectCamera(
            {
                ...this._model,
                cameraSettings: this._model.mergedConfiguration.cameraSettings,
            },
            this._view,
            this._services
        );

        this._createAttempt();

        await showDescription(
            { ...this._model, motionControl: this._model.mergedConfiguration.motionControl },
            this._view,
            this._services,
            logger
        );

        await this._prepareEnvironmentForBiometricInspection();

        await prepareViewForBiometricInspection(
            this._view,
            this._model.videoSource.stream,
            normalizationCalculator!,
            customEventsListeners,
            logger
        );

        calculateNormalizationCoefficients(this._view, normalizationCalculator, logger);

        if (this._model.mergedConfiguration.motionControl.enabled) {
            await identifyFacePositionStage(
                {
                    ...this._model,
                    ...this._model.mergedConfiguration,
                },
                this._view,
                this._services,
                'Motion Control'
            );
            await motionControl(
                {
                    ...this._model,
                    ...this._model.mergedConfiguration,
                    onMotion: this._model.clientSideConfiguration.callbacks?.onMotion as onMotionCallback,
                },
                this._view,
                this._services
            );
        }

        if (
            this._model.bestshots.collection.length <
            this._model.mergedConfiguration.clientServerConnectionSettings.requiredReferenceFrameCount
        ) {
            await identifyFacePositionStage(
                {
                    ...this._model,
                    ...this._model.mergedConfiguration,
                },
                this._view,
                this._services,
                'Take Face Bestshot'
            );
            await takeBestshots(
                {
                    ...this._model,
                    ...this._model.mergedConfiguration,
                },
                this._view,
                this._services
            );
        }

        removeViewForBiometricInspection(this._view, customEventsListeners);
        this._model.videoSource.destroyStream();
        await stopBiometricSerivces(processingVideoStream, faceDetector, customEventsListeners, logger);

        await handleBestshot(
            {
                ...this._model,
                ...this._model.mergedConfiguration,
                onStartValidation: this._model.clientSideConfiguration.callbacks
                    ?.onStartValidation as onStartValidationCallback,
                onGetReferenceImages: this._model.clientSideConfiguration.callbacks
                    ?.onGetReferenceImages as onGetReferenceImagesCallback,
            },
            this._view,
            this._services
        );
        await validateFlowResult(this._model, this._view, this._services);

        await this._services.processingVideoStream?.destroy();
    }

    private async _createAttempt() {
        const { applicant, videoSource, mergedConfiguration } = this._model;
        const { availableStreams: avaliableStreams, videoTrack } = videoSource;
        const { fingerprintCreator, endeavorDatabaseApi, attemptDatabaseApi, logger } = this._services;

        try {
            logger?.addDebugLog('Creating endeavor has been started');
            this._model.endeavor = await endeavorDatabaseApi!.create(applicant!.id);
            logger?.addDebugLog('Creating endeavor has been fihished');
            logger?.addDebugLog(`Endeavor ID: ${this._model.endeavor.id}`);
            if (logger) logger.endeavorId = this._model.endeavor.id;
        } catch (err) {
            logger?.addErrorLog(`Failed creating of endeavor`);
            let webError = new WebComponentError({ message: (err as Error).message });
            if (err instanceof WebComponentError) webError = err;
            webError.dispatch();
            return;
        }

        logger?.addDebugLog('Creating fingerprint has been started');
        this._model.fingerprint = await fingerprintCreator!.create(
            avaliableStreams,
            videoTrack!.track,
            mergedConfiguration.fingerprintWaitTime
        );
        logger?.addDebugLog('Creating fingerprint has been fihished');

        try {
            const { fingerprint, endeavor } = this._model;
            logger?.addDebugLog('Creating attempt has been started');
            this._model.attempt = await attemptDatabaseApi!.create(applicant!.id, endeavor!.id, fingerprint);
            logger?.addDebugLog('Creating attempt has been fihished');
            logger?.addDebugLog(`Attempt ID: ${this._model.attempt.id}`);
            if (logger) logger.attemptId = String(this._model.attempt.id);
        } catch (err) {
            logger?.addDebugLog(`Fingerprint: ${serializeObject(this._model.fingerprint)}`);
            logger?.addErrorLog(`Failed creating of attempt`);
            let webError = new WebComponentError({ message: (err as Error).message });
            if (err instanceof WebComponentError) webError = err;
            webError.dispatch();
        }
    }

    private async _prepareEnvironmentForBiometricInspection() {
        const { videoSource, mergedConfiguration } = this._model;
        const { processingVideoStream, device, customEventsListeners, faceDetector, logger, localizator } =
            this._services;

        try {
            renderPrepareEnvironmentPreloader(this._view, localizator);
            await waitWhileReadyForBiometricInspection(this._isReadyForBiometricInspection.bind(this), logger);
            await runBiometricSerivces(
                videoSource.videoTrack!,
                processingVideoStream,
                device,
                customEventsListeners,
                logger
            );
            await setAverageFaceDetectionTime(
                mergedConfiguration.faceModelSettings,
                processingVideoStream,
                faceDetector,
                logger
            );
            await prepareConnection(
                {
                    correlationId: this._model.correlationId!,
                    endeavor: this._model.endeavor!,
                    baseUrl: this._model.clientSideConfiguration.baseUrl,
                    token:
                        this._model.clientSideConfiguration.authenticationToken ??
                        this._model.mergedConfiguration.videoRecorderToken,
                },
                this._services
            );
        } catch (err) {
            throw err;
        } finally {
            this._view.removePreloader();
        }
    }

    private _isReadyForBiometricInspection() {
        const { logger } = this._services;

        const { faceDetector, processingVideoStream } = this._services;
        const { mergedConfiguration, endeavor, attempt } = this._model;
        const { faceModelSettings } = mergedConfiguration;

        const isDetectorReady = faceModelSettings.modelEnabled
            ? !!faceDetector && faceDetector.status === 'ready'
            : true;
        const isProcessingVideoStreamReady = !!processingVideoStream && !!processingVideoStream.isLoaded;
        const isEndeavorReady = endeavor !== undefined;
        const isAttemptReady = attempt !== undefined;

        logger?.addDebugLog(`Face detector enabled: ${faceModelSettings.modelEnabled}`);
        if (faceModelSettings.modelEnabled) logger?.addDebugLog(`Face detector status: ${faceDetector?.status}`);
        logger?.addDebugLog(`Processing video stream ready: ${isProcessingVideoStreamReady}`);
        logger?.addDebugLog(`Enveavor ready: ${isEndeavorReady}`);
        logger?.addDebugLog(`Attempt ready: ${isAttemptReady}`);

        const isReady = isDetectorReady && isProcessingVideoStreamReady && isEndeavorReady && isAttemptReady;
        logger?.addDebugLog(`Environmen ready: ${isReady}`);

        return isReady;
    }

    async destroy() {
        const { customEventsListeners } = this._services;
        stopLogDetection(customEventsListeners!);
        stopLogVideoFrame(customEventsListeners!);
        stopHandleErrorEvent(customEventsListeners!);

        this._view.destroy();
        await this._model.destroy();
        await this._services.destroy();
    }
}
