import Model from './model';
import Services from './services';

import { LiteComponentSettingsFromClient } from '../../application';
import {
    BestshotMetrics,
    LiteValidationResult,
    onGetReferenceImagesCallback,
    onMotionCallback,
    onStartValidationCallback,
    UiKit,
    WebComponentError,
} from '../../shared';

import {
    calculateNormalizationCoefficients,
    callCallback,
    callOnMountedCallback,
    checkSupportHardwareAcceleration,
    checkSupportRequiredApi,
    consoleLogComponentVersion,
    faceMatching,
    generateCorrelationId,
    generateSessionId,
    getCurrentStageLocalizatedName,
    getLocalizatedErrorMessage,
    handleBestshot,
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
    mergeLiteConfigurations,
    motionControl,
    prepareConnection,
    prepareViewForBiometricInspection,
    removeViewForBiometricInspection,
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
    validateClientSideLiteConfiguration,
    View,
    waitWhileReadyForBiometricInspection,
} from '../_core';
import { IWebComponent } from '../_core/web_component';

export default class TDVLiteOnboarding implements IWebComponent {
    protected _view: View;
    protected _model: Model;
    protected _services: Services;

    constructor(configurationFromClient: LiteComponentSettingsFromClient) {
        consoleLogComponentVersion();

        this._model = new Model(configurationFromClient);
        this._view = new View(
            this._model.clientSideConfiguration.mountElement,
            this._model.clientSideConfiguration.uiKit as UiKit,
            new Set(['backButton'])
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
        logComponentMode('Lite', logger);
        logClientSideConfiguration(this._model.clientSideConfiguration);

        startHandleErrorEvent(this._model.flow, customEventsListeners!, this._handleError.bind(this));
        this._init();
    }

    private async _handleError(error: Error) {
        const { processingVideoStream, faceDetector, customEventsListeners, logger, inspectionTransport, localizator } =
            this._services;
        logger?.addDebugLog(`Handle stage error starting`);
        logger?.addDebugLog(`Error stack: ${error.stack}`);

        await stopBiometricSerivces(processingVideoStream, faceDetector, customEventsListeners, logger);

        this._view.removePreloader();
        this._view.relativeContainer.root.remove();
        this._view.textHints.root.remove();

        if (inspectionTransport?.isOpenConnection()) {
            logger?.addDebugLog('Close connection');
            inspectionTransport?.closeConnection();
        }

        const { callbacks } = this._model.clientSideConfiguration;

        const stageName = this._model.flow.stage?.name;
        const localizationStageName = getCurrentStageLocalizatedName(stageName);
        logger?.addDebugLog(`Current stage name: ${stageName}, localization stage name: ${localizationStageName}`);

        await this._model.flow.stage?.destroy();
        await this._model.destroy();

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

        this._view.removePreloader();
        await logger?.flush();

        logger?.addDebugLog(`Handle stage error has been finished`);
    }

    private async _init() {
        try {
            const {
                device,
                browserSupportApiChecker,
                processingVideoStream,
                logger,
                localizator,
                configurationValidator,
            } = this._services;
            const { clientSideConfiguration, correlationId } = this._model;
            const { authenticationToken } = clientSideConfiguration;

            this._model.flow.error = undefined;
            renderPrepareEnvironmentPreloader(this._view, localizator);

            checkSupportRequiredApi(browserSupportApiChecker!, logger);
            validateClientSideLiteConfiguration(
                clientSideConfiguration,
                this._services.configurationValidator!,
                logger
            );
            mergeLiteConfigurations(this._model, this._services.configurationMerger!, logger);

            const { mergedConfiguration } = this._model;
            const { networksPath, faceModelSettings, motionControl } = this._model.mergedConfiguration;

            logger?.addDebugLog('Validation merged lite configuration starting');
            if (!faceModelSettings.modelEnabled) {
                configurationValidator!.checkThatTimeToStartRecordAtLeast1000ms(faceModelSettings.timeToStartRecord);
                configurationValidator!.checkThatMotionControlDisabled(motionControl.enabled);
            }
            logger?.addDebugLog('Validation merged lite configuration has been finished');

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

        await selectCamera(
            {
                ...this._model,
                cameraSettings: this._model.mergedConfiguration.cameraSettings,
            },
            this._view,
            // @ts-ignore
            this._services
        );

        await showDescription(
            { ...this._model, motionControl: this._model.mergedConfiguration.motionControl },
            this._view,
            // @ts-ignore
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
                // @ts-ignore
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
                //@ts-ignore
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
                    onMotion: this._model.clientSideConfiguration.callbacks?.onMotion as onMotionCallback,
                },
                this._view,
                // @ts-ignore
                this._services,
                'Take Face Bestshot'
            );
            await takeBestshots(
                {
                    ...this._model,
                    ...this._model.mergedConfiguration,
                },
                this._view,
                //@ts-ignore
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
            //@ts-ignores
            this._services
        );

        await faceMatching(
            this._model,
            this._view,
            //@ts-ignores
            this._services
        );

        this._callOnValidateCallbackIfExist({
            ...(this._model.bestshots.bestshotBiometryInfo as BestshotMetrics),
            verification: this._model.verificationResult,
            endeavorId: this._model.endeavor!.id!,
            externalLink: this._model.mergedConfiguration.externalLink,
            motionControlResult: this._model.motionControlMeta.result,
        });

        await this._services.processingVideoStream?.destroy();
    }

    private async _createEndeavor() {
        const { externalLink } = this._model.clientSideConfiguration;
        const { endeavorDatabaseApi, logger } = this._services;

        try {
            logger?.addDebugLog('Creating endeavor has been started');
            this._model.endeavor = await endeavorDatabaseApi!.create(externalLink);
            logger?.addDebugLog('Creating endeavor has been fihished');
            logger?.addDebugLog(`Endeavor ID: ${this._model.endeavor.id}`);
            if (logger) logger.endeavorId = this._model.endeavor.id;
        } catch (err) {
            logger?.addErrorLog(`Failed creating of endeavor`);
            let webError = new WebComponentError({ message: (err as Error).message });
            if (err instanceof WebComponentError) webError = err;
            throw webError;
        }
    }

    private async _prepareEnvironmentForBiometricInspection() {
        const { videoTrack } = this._model.videoSource;
        const { processingVideoStream, device, customEventsListeners, faceDetector, logger, localizator } =
            this._services;

        try {
            renderPrepareEnvironmentPreloader(this._view, localizator);
            await this._createEndeavor();
            await waitWhileReadyForBiometricInspection(this._isReadyForBiometricInspection.bind(this), logger);
            await runBiometricSerivces(videoTrack!, processingVideoStream, device, customEventsListeners, logger);
            await setAverageFaceDetectionTime(
                this._model.mergedConfiguration.faceModelSettings,
                processingVideoStream,
                faceDetector,
                logger
            );

            await prepareConnection(
                {
                    correlationId: this._model.correlationId!,
                    endeavor: this._model.endeavor!,
                    baseUrl: this._model.clientSideConfiguration.baseUrl,
                    token: this._model.mergedConfiguration.authenticationToken,
                },
                // @ts-ignore
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
        const { mergedConfiguration, endeavor } = this._model;
        const { faceModelSettings } = mergedConfiguration;

        const isDetectorReady = faceModelSettings.modelEnabled
            ? !!faceDetector && faceDetector.status === 'ready'
            : true;
        const isProcessingVideoStreamReady = !!processingVideoStream && !!processingVideoStream.isLoaded;
        const isEndeavorReady = endeavor !== undefined;

        logger?.addDebugLog(`Face detector enabled: ${faceModelSettings.modelEnabled}`);
        if (faceModelSettings.modelEnabled) logger?.addDebugLog(`Face detector status: ${faceDetector?.status}`);
        logger?.addDebugLog(`Processing video stream ready: ${isProcessingVideoStreamReady}`);
        logger?.addDebugLog(`Enveavor ready: ${isEndeavorReady}`);

        const isReady = isDetectorReady && isProcessingVideoStreamReady && isEndeavorReady;
        logger?.addDebugLog(`Environmen ready: ${isReady}`);

        return isReady;
    }

    private _callOnValidateCallbackIfExist(data: LiteValidationResult) {
        const { logger } = this._services;
        callCallback(this._model.clientSideConfiguration.callbacks?.onValidate, [data], logger);
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
