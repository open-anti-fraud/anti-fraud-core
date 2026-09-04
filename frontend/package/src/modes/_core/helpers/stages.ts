import {
    FlowBestshotMeta,
    FlowInitialPositionMeta,
    FlowMotionControlMeta,
    FlowStageMeta,
    FlowVideoSourceMeta,
} from '../../../application';
import { Logger } from '../../../infrastructure';
import {
    CameraSettingsBlock,
    FaceBestshotSettingsBlock,
    FaceDetectorSettingsBlock,
    MotionControlSettingsBlock,
    onGetReferenceImagesCallback,
    onMotionCallback,
    onStartValidationCallback,
    ServerConnectionSettingsBlock,
    Stage,
} from '../../../shared';
import {
    descriptionStageFactory,
    faceMatchingStageFactory,
    handleBestshotStageFactory,
    identifyDynamicFacePositionStageFactory,
    identifyFacePositionWithoutDetectorFactory,
    identifyStaticFacePositionFactory,
    motionControlStageFactory,
    selectCameraStageFactory,
    validateApplicantStatusStageFactory,
    validateFlowResultStageFactory,
} from '../../../stages';
import takeFaceBestshotsStageFactory from '../../../stages/take_face_bestshots_stage/factory';
import { default as LiteModel } from '../../lite/model';
import { default as StandartModel } from '../web_component.model';
import Services from '../web_component.services';
import View from '../web_component.view';
import { callCallback } from './callbacks';

export async function identifyApplicantStatus(model: StandartModel, view: View, services: Services) {
    try {
        services?.logger?.addInfoLog('Identify applicant status starting');
        model.flow.stage = validateApplicantStatusStageFactory({
            view,
            model,
            services,
        });

        await model.flow.stage.run(model.mode);

        model.flow.stage?.destroy();
        model.flow.stage = undefined;
        services?.logger?.addInfoLog('Identify applicant status has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of identify applicant status stage');
        view.identifyApplicantForm.destroy();
        view.continueButton.removeFromDom();
        throw err;
    }
}

export async function selectCamera(
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
    } & CameraSettingsBlock,
    view: View,
    services: Services
) {
    try {
        services?.logger?.addInfoLog('Select camera stage starting');
        model.flow.stage = selectCameraStageFactory({
            view: view,
            model: {
                videoSource: model.videoSource,
                cameraSettings: model.cameraSettings,
            },
            services: services,
        });

        await model.flow.stage.run();

        model.flow.stage?.destroy();
        model.flow.stage = undefined;

        services.logger?.addInfoLog('Select camera stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of select camera stage');
        view.cameraSelector.destroy();
        view.relativeContainer.destroy();
        view.continueButton.destroy();
        view.backButton?.destroy();
        view.textHints.removeFromDom();
        throw err;
    }
}

export async function showDescription(
    model: { flow: FlowStageMeta } & MotionControlSettingsBlock,
    view: View,
    services: Services,
    logger?: Logger
) {
    try {
        services.logger?.addInfoLog('Description stage starting');
        const { motionControl } = model;

        if (motionControl.enabled && motionControl.description.enabled) {
            model.flow.stage = descriptionStageFactory({
                view: view,
                model: motionControl.description,
                services: services,
            });

            await model.flow.stage.run();
            model.flow.stage.destroy();
            model.flow.stage = undefined;
        }

        services.logger?.addInfoLog('Description stage has been finished');
    } catch (err) {
        logger?.addWarningLog('Error occurs of description stage');
        view.descriptionHeading.destroy();
        view.descriptionText.destroy();
        view.continueButton.destroy();
        view.backButton?.destroy();
        throw err;
    }
}

export async function identifyFacePositionStage(
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        initialPosition: FlowInitialPositionMeta;
    } & { onMotion?: onMotionCallback } & MotionControlSettingsBlock &
        FaceDetectorSettingsBlock &
        FaceBestshotSettingsBlock,
    view: View,
    services: Services,
    module: 'Motion Control' | 'Take Face Bestshot'
) {
    try {
        services?.logger?.addInfoLog(`Identify face position stage (${module}) has been started`);
        const settings =
            module === 'Motion Control' ? model.motionControl.faceBorder : model.faceBestshotSettings.faceBorder;

        let T;
        if (model.faceModelSettings.modelEnabled) {
            if (settings.autodetected.enabled) {
                services?.logger?.addDebugLog('Identify face position in dynamic mode');
                T = identifyDynamicFacePositionStageFactory;
            } else {
                services?.logger?.addDebugLog('Identify face position in static mode');
                T = identifyStaticFacePositionFactory;
            }
        } else {
            services?.logger?.addDebugLog('Identify face position in without face detector mode');
            T = identifyFacePositionWithoutDetectorFactory;
        }

        model.flow.stage = T({
            view: view,
            model: {
                flow: model.flow,
                faceBestshotSettings: model.faceBestshotSettings,
                faceModelSettings: model.faceModelSettings,
                initialPosition: model.initialPosition,
                motionControl: model.motionControl,
                networksPath: model.networksPath,
                videoSource: model.videoSource,
            },
            services: services,
            module,
        }) as Stage;

        await model.flow.stage.run();
        model.flow.stage.destroy();
        model.flow.stage = undefined;
        services?.logger?.addInfoLog(`Identify face position stage (${module}) has been finished`);
    } catch (err) {
        services?.logger?.addWarningLog(`Error occurs of identify face position stage (${module})`);
        throw err;
    }
}

export async function motionControl(
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        initialPosition: FlowInitialPositionMeta;
        bestshots: FlowBestshotMeta;
        motionControlMeta: FlowMotionControlMeta;
    } & { onMotion?: onMotionCallback } & MotionControlSettingsBlock &
        ServerConnectionSettingsBlock &
        FaceDetectorSettingsBlock,
    view: View,
    services: Services
) {
    try {
        services?.logger?.addInfoLog('Motion control stage has been started');

        model.flow.stage = motionControlStageFactory({
            view: view,
            model: model,
            services: services,
        });

        await model.flow.stage.run();
        model.flow.stage.destroy();
        model.flow.stage = undefined;
        services?.logger?.addInfoLog('Motion control stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of motion control stage');
        throw err;
    }
}

export async function takeBestshots(
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        initialPosition: FlowInitialPositionMeta;
        bestshots: FlowBestshotMeta;
    } & ServerConnectionSettingsBlock &
        FaceDetectorSettingsBlock,
    view: View,
    services: Services
) {
    try {
        services?.logger?.addInfoLog('Take face bestshots stage starting');

        model.flow.stage = takeFaceBestshotsStageFactory({
            view: view,
            model: model,
            services: services,
        });

        await model.flow.stage.run();
        model.flow.stage.destroy();
        model.flow.stage = undefined;
        services?.logger?.addInfoLog('Take face bestshots stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of take face bestshots stage');
        throw err;
    }
}

export async function handleBestshot(
    model: {
        flow: FlowStageMeta;
        videoSource: FlowVideoSourceMeta;
        bestshots: FlowBestshotMeta;
    } & {
        onStartValidation?: onStartValidationCallback;
        onGetReferenceImages?: onGetReferenceImagesCallback;
    } & ServerConnectionSettingsBlock,
    view: View,
    services: Services
) {
    try {
        services?.logger?.addInfoLog('Handle bestshot stage starting');
        callCallback(model.onStartValidation);

        model.flow.stage = handleBestshotStageFactory({
            view: view,
            model: model,
            services: services,
        });

        await model.flow.stage.run();
        services?.logger?.addInfoLog('Handle bestshot stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of handle bestshot stage');
        throw err;
    }
}

export async function validateFlowResult(model: StandartModel, view: View, services: Services) {
    try {
        services?.logger?.addInfoLog('Validate flow result stage starting');
        callCallback(model.clientSideConfiguration.callbacks?.onStartValidation);

        model.flow.stage = validateFlowResultStageFactory({
            view: view,
            model: model,
            services: services,
        });

        await model.flow.stage.run();
        services?.logger?.addInfoLog('Validate flow result stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of validate flow result stage');
        view.validationFlowVerdict.removeFromDom();
        throw err;
    }
}

export async function faceMatching(model: LiteModel, view: View, services: Services) {
    try {
        services?.logger?.addInfoLog('Face matching stage starting');

        model.flow.stage = faceMatchingStageFactory({
            view: view,
            model: model,
            services: services,
        });

        await model.flow.stage.run();
        services?.logger?.addInfoLog('Face matching stage has been finished');
    } catch (err) {
        services?.logger?.addWarningLog('Error occurs of face matching stage');
        throw err;
    }
}
