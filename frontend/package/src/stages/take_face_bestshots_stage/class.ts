import { FlowBestshotMeta, FlowInitialPositionMeta, FlowVideoSourceMeta } from '../../application';
import { Services, View } from '../../modes/_core';
import {
    CaptureFaceBestshotTimeoutError,
    Events,
    FaceDetectionResult,
    FaceDetectorSettingsBlock,
    intervalCheckWithTimeout,
    RawVideoFrame,
    ServerConnectionSettingsBlock,
    Stage,
} from '../../shared';

type Model = {
    videoSource: FlowVideoSourceMeta;
    initialPosition: FlowInitialPositionMeta;
    bestshots: FlowBestshotMeta;
} & ServerConnectionSettingsBlock &
    FaceDetectorSettingsBlock;

export type Props = {
    view: View;
    model: Model;
    services: Services;
};

export default class TakeFaceBestshotsStage implements Stage {
    name = 'TakeFaceBestshotsStage';

    private _view: View;
    private _model: Model;
    private _services: Services;

    private _handleBestshots = this._handleBesthotsEvents.bind(this);
    private _event: string;

    constructor(props: Props) {
        this._model = props.model;
        this._view = props.view;
        this._services = props.services;

        const { logger } = this._services;
        const { modelEnabled } = this._model.faceModelSettings;
        if (modelEnabled) {
            this._event = Events.DETECTOR_PROCESSED_FRAME;
            this._handleBestshots = this._handleBesthotsEvents.bind(this);
        } else {
            this._event = Events.VIDEO_FRAME_RECEIVED;
            this._handleBestshots = this._handleRawFrameEvents.bind(this);
        }
        logger?.addDebugLog(`Subscribe on ${this._event}`);
    }

    async run() {
        try {
            const track = this._model.videoSource.videoTrack;
            track!.checkThatTrackIsEnabled();
            track!.checkThatTrackIsExist();
            track!.checkThatTrackIsLive();

            await this._collectFaceBestshots();
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    private async _collectFaceBestshots() {
        this._startCollectionBestshots();
        await intervalCheckWithTimeout(
            this._isCollected.bind(this),
            () => {
                throw new CaptureFaceBestshotTimeoutError();
            },
            30_000,
            100
        );
    }

    private _startCollectionBestshots() {
        const { customEventsListeners, logger } = this._services;
        logger?.addDebugLog('Starting collect bestshots');
        customEventsListeners?.addListener(this._event, this._handleBestshots);
    }

    private _isCollected() {
        const { logger } = this._services;
        const { requiredReferenceFrameCount } = this._model.clientServerConnectionSettings;
        const isCollected = this._model.bestshots.collection.length >= requiredReferenceFrameCount;
        logger?.addDebugLog(
            `Collected: ${this._model.bestshots.collection.length} from ${requiredReferenceFrameCount}`
        );
        return isCollected;
    }

    private _handleBesthotsEvents(event: Event) {
        const { faceRotationService } = this._services;
        const { initialPosition } = this._model;
        const { faceModelSettings, clientServerConnectionSettings } = this._model;

        const limit = clientServerConnectionSettings.requiredReferenceFrameCount;
        if (this._model.bestshots.collection.length >= limit) return;

        const data = (event as CustomEvent).detail as FaceDetectionResult & RawVideoFrame;
        if (!data.bbox || !data.keypoints || !data.image) return;

        const verticalNormalizationAngle = -initialPosition.position!.rotation.angles.pitch!;
        const { angles, currentHorizontalRotation, currentVerticalRotation } =
            faceRotationService!.defineRotationAnglesBy3dKeypoints(
                faceModelSettings.angleCalculation,
                data.keypoints,
                verticalNormalizationAngle
            );

        const isCenter = currentHorizontalRotation === 'center' && currentVerticalRotation === 'center';
        if (!isCenter) return;

        this._model.bestshots.collection.push({
            ...data,
            angles,
            currentHorizontalRotation,
            currentVerticalRotation,
        });
    }

    private _handleRawFrameEvents(event: Event) {
        const data = (event as CustomEvent).detail.data as RawVideoFrame;

        if (!data.image) return;

        this._model.bestshots.collection.push({
            ...data,
            bbox: {
                height: 0,
                width: 0,
                xMax: 0,
                xMin: 0,
                yMax: 0,
                yMin: 0,
            },
            keypoints: [],
            normalizedKeypoints: [],
            angles: { pitch: 0, yaw: 0, roll: 0 },
            currentVerticalRotation: 'center',
            currentHorizontalRotation: 'center',
        });
    }

    private _stopCollectionBestshots() {
        const { customEventsListeners, logger } = this._services;
        logger?.addDebugLog('Stopping collecting bestshots');
        customEventsListeners?.removeListener(this._event, this._handleBestshots);
    }

    public destroy() {
        this._stopCollectionBestshots();
    }
}
