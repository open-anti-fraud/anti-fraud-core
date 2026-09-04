import {
    getAngleDeviation,
    intervalCheck,
    intervalCheckWithTimeout,
    InvalidFacesAmountOnFrameError,
    onGetReferenceImagesCallback,
    ServerConnectionSettingsBlock,
    Stage,
    TransmissionTimeoutError,
    TransportError,
    WebComponentError,
} from '../../shared';

import { FlowBestshotMeta, FlowVideoSourceMeta } from '../../application';
import { InspectionsTransport } from '../../infrastructure';
import { Services, View } from '../../modes/_core';
import { NoBestshotsError } from './errors';

type Model = {
    videoSource: FlowVideoSourceMeta;
    bestshots: FlowBestshotMeta;
} & { onGetReferenceImages?: onGetReferenceImagesCallback } & ServerConnectionSettingsBlock;

export type Props = {
    view: View;
    model: Model;
    services: Services;
};

export default class HandleBestshotStage implements Stage {
    name = 'HandleBestshotStage';

    private _model: Model;
    private _view: View;
    private _services: Services;
    private _transportError: WebComponentError | undefined;
    private _transportAwaitedResponse: string | undefined;
    private _unsubscribeMethod: () => void;

    constructor(props: Props) {
        this._model = props.model;
        this._view = props.view;
        this._services = props.services;
        this._unsubscribeMethod = this._services.inspectionTransport!.subscribe(
            this._handleTransportMessage.bind(this)
        );
    }

    private _handleTransportMessage({ message, code }: { message: string; code: string | undefined | null }) {
        if (code) this._transportError = new TransportError({ message, code });
        if (!this._transportError && this._transportAwaitedResponse && message.includes(this._transportAwaitedResponse))
            this._transportAwaitedResponse = undefined;
    }

    async run() {
        const { localizator } = this._services;

        try {
            if (this._model.bestshots.collection.length === 0) throw new NoBestshotsError();

            const message = localizator!.getLocalizedMessageByKey('Stages.ValidateFlowResult.SendingDataToServer');
            this._view.setPreloader(message);

            await this._sendBestshots();

            this._view.removePreloader();
        } catch (err) {
            throw this._handleError(err);
        } finally {
            this._unsubscribeMethod();
        }
    }

    private _handleError(err: unknown) {
        if (err instanceof TransportError && err.code === '116002') return new InvalidFacesAmountOnFrameError();
        return err;
    }

    private async _sendBestshots() {
        const { inspectionTransport, logger } = this._services;

        await this._startBestshotTransmission(inspectionTransport!);
        const isSuitableImageFound = await this._sendBestshotsCycle(inspectionTransport!);
        if (!isSuitableImageFound) await this._stopBestshotTransmission(inspectionTransport!);
        await this._saveBestshot(inspectionTransport!);

        try {
            const { bestshotInfo, image } = this._getBesthostFrame(inspectionTransport!);
            this._model.bestshots.bestshot = image;
            this._model.bestshots.bestshotBiometryInfo = bestshotInfo;
            await this._callOnGetReferenceImagesCallbackIfExist(image);
        } catch (err) {
            throw err;
        } finally {
            logger?.addDebugLog('Closing connection');
            inspectionTransport!.closeConnection();
        }
    }

    public async _startBestshotTransmission(inspectionTransport: InspectionsTransport) {
        const { logger } = this._services;

        logger?.addDebugLog('Starting bestshot transmission has been started');

        logger?.addDebugLog('Preparing connection has been started');
        try {
            logger?.addDebugLog('Checking that connection is open has been started');
            inspectionTransport!.checkThatConnectionIsOpen();
            logger?.addDebugLog('Checking that connection is open has been finished');
        } catch {
            logger?.addWarningLog('Connection is closed and will be reopen');
            await inspectionTransport!.openConnection();
            logger?.addDebugLog('Connection has been reopened');
        } finally {
            logger?.addDebugLog('Clearing connection message history has been started');
            inspectionTransport!.history = [];
            logger?.addDebugLog('Clearing connection message history has been finished');
        }
        logger?.addDebugLog('Preparing connection has been finished');

        const startAwaitResponseFn = this._createAwaitResponseFn('Transferring permitted');
        logger?.addDebugLog('Sending start transmission signal has been started');
        inspectionTransport!.sendStartBestshotsTransmissionSignal();
        logger?.addDebugLog('Sending start transmission signal has been finished');
        await startAwaitResponseFn();

        logger?.addDebugLog('Starting bestshot transmission has been finished');
    }

    public async _sendBestshotsCycle(inspectionTransport: InspectionsTransport) {
        const { logger } = this._services;
        let isSuitableImageFound = false;

        logger?.addDebugLog('Sorting bestshot by angles has been started');
        this._model.bestshots.collection.sort((a, b) => {
            const angleDiffA = getAngleDeviation(a.angles.yaw!, a.angles.pitch!);
            const angleDiffB = getAngleDeviation(b.angles.yaw!, b.angles.pitch!);
            return angleDiffA - angleDiffB;
        });
        logger?.addDebugLog('Sorting bestshot by angles has been finished');

        logger?.addDebugLog('Sending bestshots to server has been started');
        for await (const bestshot of this._model.bestshots.collection) {
            const buffer = await this._services.faceBestshotSerializator!.serialize(
                bestshot.videoId,
                bestshot.index,
                bestshot.image,
                bestshot.angles.yaw!,
                bestshot.angles.pitch!,
                this._model.clientServerConnectionSettings.referenceFrameQuality
            );
            const startAwaitResponseFn = this._createAwaitResponseFn('uitable');
            logger?.addDebugLog('Sending bestshot to server has been started');
            inspectionTransport!.sendMessage(buffer);
            logger?.addDebugLog('Sending bestshot to server has been finished');
            await startAwaitResponseFn();

            const hasParentId = inspectionTransport!.history?.some((item) => item.includes(`parent_id`));
            isSuitableImageFound = inspectionTransport!.history?.some((item) => item.includes('Suitable image found'));
            logger?.addDebugLog(`Suitable image found: ${isSuitableImageFound}`);

            if (hasParentId || isSuitableImageFound) break;
        }
        logger?.addDebugLog('Sending bestshots to server has been finished');

        return isSuitableImageFound;
    }

    public async _stopBestshotTransmission(inspectionTransport: InspectionsTransport) {
        const startAwaitResponseFn = this._createAwaitResponseFn('Frames handled');
        inspectionTransport!.sendStopRecordSignal();
        await startAwaitResponseFn();
    }

    public async _saveBestshot(inspectionTransport: InspectionsTransport) {
        const { logger } = this._services;

        const startAwaitResponseFn = this._createAwaitResponseFn('Save successfully performed');
        logger?.addDebugLog('Sending save signal has been started');
        inspectionTransport!.sendSaveRecordSignal();
        logger?.addDebugLog('Sending save signal has been finished');

        logger?.addDebugLog(`Checking that has bestshot frame has started`);
        await intervalCheck(() => {
            if (this._transportError) throw this._transportError;
            return inspectionTransport!.history.some((item) => typeof item === 'string' && item.includes(`parent_id`));
        }, 100);
        logger?.addDebugLog(`Checking that has bestshot frame has finished`);

        await startAwaitResponseFn();
    }

    private _getBesthostFrame(inspectionTransport: InspectionsTransport) {
        const { logger } = this._services;

        logger?.addDebugLog('Getting besthost frame has been started');

        logger?.addDebugLog('Identifying besthost ID from server answer has been started');
        const answer = inspectionTransport!.history.find(
            (item) => typeof item === 'string' && item.includes(`parent_id`)
        );
        logger?.addDebugLog('Identifying besthost ID from server answer has been finished');

        logger?.addDebugLog('Parse server answer has been started');
        const keyframe = JSON.parse(answer!).body[0];
        logger?.addDebugLog('Parse server answer has been finished');

        logger?.addDebugLog('Searching frame by ID has been started');
        const besthost = this._model.bestshots.collection.find(
            (bestshot) => bestshot.index === keyframe.info.frame_number
        );
        logger?.addDebugLog('Searching frame by ID has been finished');
        logger?.addDebugLog(`Frame: [${besthost?.image.width}; ${besthost?.image.height}]`);

        logger?.addDebugLog('Getting besthost frame has been finished');

        return { image: besthost?.image, bestshotInfo: keyframe['info']['image_info'] };
    }

    public async _callOnGetReferenceImagesCallbackIfExist(image: ImageBitmap | undefined) {
        const { logger } = this._services;
        const { clientServerConnectionSettings } = this._model;

        if (image === undefined) {
            logger?.addWarningLog('Cancel call onGetReferenceImages callback because reference images is undefined');
            return;
        }

        if (this._model.onGetReferenceImages && typeof this._model.onGetReferenceImages === 'function') {
            logger?.addDebugLog('Converting image bitmap to base64 has been started');
            const result = await this._services.faceBestshotSerializator!.convertImageBitmapToBase64(
                image,
                clientServerConnectionSettings.referenceFrameQuality
            );
            logger?.addDebugLog('Converting image bitmap to base64 has been finished');

            if (result instanceof Error) throw result;

            logger?.addDebugLog('onGetReferenceImages callback calling');
            this._model.onGetReferenceImages(result);
        }
    }

    private _createAwaitResponseFn(message: string) {
        const { logger } = this._services;
        this._transportAwaitedResponse = message;

        return async () => {
            logger?.addDebugLog(`Waiting "${message}" answer from server has been started`);
            await intervalCheckWithTimeout(
                () => {
                    if (this._transportError) throw this._transportError;
                    return !this._transportAwaitedResponse;
                },
                () => {
                    throw new TransmissionTimeoutError();
                },
                this._model.clientServerConnectionSettings.transmissionWaitTimeout
            );
            logger?.addDebugLog(`Answer "${message}" has been recieved from server`);
        };
    }

    public destroy() {
        this._unsubscribeMethod();
    }
}
