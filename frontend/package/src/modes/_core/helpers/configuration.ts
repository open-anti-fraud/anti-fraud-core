import {
    ComponentSettingsFromClient,
    LiteComponentSettingsFromClient,
    LiteMergedConfiguration,
    MergedConfiguration,
} from '../../../application';
import { ConfigurationFromServer, ConfigurationValidator, Logger } from '../../../infrastructure';
import { IConfigurationMerger } from '../../../shared';
import Model from '../web_component.model';

export function validateClientSideConfiguration(
    clientSideConfiguration: ComponentSettingsFromClient,
    configurationValidator: ConfigurationValidator,
    logger?: Logger
) {
    logger?.addDebugLog('Validation of client side configuration starting');
    const { integrationId, baseUrl } = clientSideConfiguration;
    configurationValidator!.checkThatIntegrationIdExist(integrationId);
    configurationValidator!.checkThatIntegrationIdIsValidUUID(integrationId);
    configurationValidator!.checkThatBaseUrlExist(baseUrl);
    logger?.addDebugLog('Validation of client side configuration has been finished');
}

export async function fetchConfigurationFromServer(
    model: Model,
    configurationFromServerFetcher: ConfigurationFromServer,
    logger?: Logger
) {
    const { correlationId, clientSideConfiguration } = model;
    const { baseUrl, integrationId, authenticationToken } = clientSideConfiguration;

    logger?.addDebugLog('Fetch configuration from server starting');
    model.serverSideConfiguration = await configurationFromServerFetcher!.fetch(
        baseUrl,
        integrationId,
        correlationId!,
        authenticationToken
    );

    logger?.addDebugLog('Fetch configuration from server has been finished');
}

export function mergeConfigurations(model: Model, configurationMerger: IConfigurationMerger<object>, logger?: Logger) {
    logger?.addDebugLog('Merge configurations starting');
    model.mergedConfiguration = configurationMerger!.merge({
        clientSettings: model.clientSideConfiguration,
        serverSettings: model.serverSideConfiguration.settings,
    }) as MergedConfiguration;
    logger?.addDebugLog('Merge configurations has been finished');
}

export function validateMergedConfiguration(
    model: Model,
    configurationValidator: ConfigurationValidator,
    logger?: Logger
) {
    const { serverSideConfiguration, mergedConfiguration } = model;
    const { applicantFields, applicantId, motionControl, faceModelSettings } = mergedConfiguration;

    logger?.addDebugLog('Validation merged configuration starting');

    configurationValidator!.checkThatComponentEnabled(serverSideConfiguration.active);
    configurationValidator!.checkThatExistApplicantFieldOrApplicantId(applicantId, applicantFields);

    if (!faceModelSettings.modelEnabled) {
        configurationValidator!.checkThatTimeToStartRecordAtLeast1000ms(faceModelSettings.timeToStartRecord);
        configurationValidator!.checkThatMotionControlDisabled(motionControl.enabled);
    }

    if (motionControl.enabled) {
        configurationValidator!.checkThatMotionControlAttempsCountMoreThanZero(motionControl.attemptsCount);
    }
    logger?.addDebugLog('Validation merged configuration has been finished');
}

export function validateClientSideLiteConfiguration(
    clientSideConfiguration: LiteComponentSettingsFromClient,
    configurationValidator: ConfigurationValidator,
    logger?: Logger
) {
    logger?.addDebugLog('Validation of client side configuration starting');
    const { authenticationToken, baseUrl } = clientSideConfiguration;
    configurationValidator!.checkThatAuthenticationTokenExist(authenticationToken);
    configurationValidator!.checkThatBaseUrlExist(baseUrl);
    logger?.addDebugLog('Validation of client side configuration has been finished');
}

export function mergeLiteConfigurations<
    T extends {
        mergedConfiguration: LiteMergedConfiguration;
        clientSideConfiguration: LiteComponentSettingsFromClient;
    },
>(model: T, configurationMerger: IConfigurationMerger<object>, logger?: Logger) {
    logger?.addDebugLog('Merge configurations starting');
    model.mergedConfiguration = configurationMerger!.merge({
        clientSettings: model.clientSideConfiguration,
    }) as LiteMergedConfiguration;
    logger?.addDebugLog('Merge configurations has been finished');
}
