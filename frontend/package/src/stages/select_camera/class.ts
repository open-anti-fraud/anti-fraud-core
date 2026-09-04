import { InactiveVideoTrackError, videoTrackFactory } from '../../infrastructure';
import { CameraSettingsBlock, intervalCheckWithTimeout, Stage } from '../../shared';
import { OptionsProps } from '../../ui';

import { FlowVideoSourceMeta } from '../../application';
import { Services, View } from '../../modes/_core';

export type Props = {
    view: View;
    model: { videoSource: FlowVideoSourceMeta } & CameraSettingsBlock;
    services: Services;
};

export default class SelectCameraStage implements Stage {
    public name = 'SelectCameraStage';

    private _model: { videoSource: FlowVideoSourceMeta } & CameraSettingsBlock;
    private _view: View;
    private _services: Services;

    constructor(props: Props) {
        this._model = props.model;
        this._services = props.services;
        this._view = props.view;
    }

    public async run() {
        this._renderRequestAccessToCameraPreloader();

        await this._searchMediaStream();
        this._getVideoTrack();
        await this._searchAvailableStreams();
        this._identifySelectedVideoTrack();

        if (this._canSkipUIRendering()) {
            await this._checkThatTrackReady();
            this._view.removePreloader();
            return;
        }

        this._view.removePreloader();
        this._view.renderContentLayout();
        await this._view.renderCameraPreview(this._model.videoSource.stream);
        await this._prepareView();

        return this._waitForSubmit();
    }

    private async _searchMediaStream() {
        const { videoStreamRequester, logger } = this._services;
        logger?.addDebugLog('Search media stream starting');
        this._model.videoSource.stream = await videoStreamRequester!.getFromBrowser();
        logger?.addDebugLog('Search media stream has been finished');
        logger?.addDebugLog(
            `Media stream: ${this._model.videoSource.stream.id}, isActive: ${this._model.videoSource.stream.active}`
        );
    }

    private _getVideoTrack() {
        const { logger } = this._services;
        logger?.addDebugLog('Getting a video track from the video stream has started');
        this._model.videoSource.videoTrack = videoTrackFactory(this._model.videoSource.stream!);
        logger?.addDebugLog('Getting a video track from the video stream has finished');
    }

    private async _searchAvailableStreams() {
        const { videoStreamsMetadataRequester, logger } = this._services;
        logger?.addDebugLog('Search available streams has started');
        this._model.videoSource.availableStreams = await videoStreamsMetadataRequester!.getFromBrowser();
        logger?.addDebugLog('Search available streams has been finished');
    }

    private _identifySelectedVideoTrack() {
        const { logger } = this._services;
        logger?.addDebugLog('Identify selected video track has started');
        this._model.videoSource.streamMetadata = this._getStreamMetadata();
        logger?.addDebugLog('Identify selected video track has been finished');
    }

    public _renderRequestAccessToCameraPreloader() {
        const { localizator } = this._services;
        const text = localizator!.getLocalizedMessageByKey(
            'Stages.Initialization.SelectCamera.Preloader.RequestingAccessToCamera'
        );
        this._view.setPreloader(text);
    }

    public _getStreamMetadata() {
        return this._model.videoSource.availableStreams.find(
            (item) => item.deviceId === this._model.videoSource.videoTrack!.settings.deviceId
        );
    }

    public _checkThatTrackReady() {
        const { logger } = this._services;
        const { videoTrack } = this._model.videoSource;

        logger?.addDebugLog(`Checking that video track is ready has started`);

        return intervalCheckWithTimeout(
            () => {
                logger?.addDebugLog(
                    `Video track is exist: ${videoTrack?.isExist()}, is live: ${videoTrack?.isLive()}, is enabled: ${videoTrack?.isEnabled()}`
                );
                const isReady =
                    !!videoTrack && !!videoTrack?.isExist() && !!videoTrack?.isLive() && !!videoTrack?.isEnabled();
                logger?.addDebugLog(`Checking that video track is ready has finished`);
                return isReady;
            },
            () => {
                throw new InactiveVideoTrackError();
            },
            30_000,
            100
        );
    }

    public _canSkipUIRendering() {
        const { logger, device } = this._services;
        const { availableStreams } = this._model.videoSource;
        const { autoSubmit, cameraId } = this._model.cameraSettings;

        logger?.addDebugLog(`Checking that can skip render preview has started`);

        const isMobile = device!.isMobile();
        const canSkip = autoSubmit || cameraId !== undefined || device!.isMobile();
        const hasLessTwoVideoStreams = availableStreams.length < 2;

        logger?.addDebugLog(
            `autoSubmit: ${autoSubmit}, cameraId: ${cameraId}, isMobile: ${isMobile}, availableStreams: ${availableStreams.length} `
        );

        logger?.addDebugLog(`Checking that can skip render preview has finished`);
        logger?.addDebugLog(`Can skip: ${canSkip || hasLessTwoVideoStreams}`);

        return canSkip || hasLessTwoVideoStreams;
    }

    public async _prepareView() {
        this._view.contentLayout.header.append(this._view.cameraSelector.root);
        this._addAvaliableOptions();

        this._view.cameraSelector.onChange(async (event: Event) => {
            try {
                this._view.contentLayout.content.append(this._view.preloader.root);
                this._view.continueButton.disable();
                this._view.backButton?.disable();
                this._view.cameraSelector.disable();

                this._model.videoSource.videoTrack?.destroy();
                this._model.videoSource.destroyStream();

                const { videoStreamRequester } = this._services;
                videoStreamRequester!.setPreferStreamId((event.target as HTMLSelectElement).value);

                await this._searchMediaStream();
                this._getVideoTrack();
                await this._searchAvailableStreams();
                this._identifySelectedVideoTrack();

                this._addAvaliableOptions();

                await this._view.renderCameraPreview(this._model.videoSource.stream);
            } finally {
                this._view.removePreloader();
                this._view.cameraSelector.enable();
                this._view.continueButton.enable();
                this._view.backButton?.enable();
            }
        });

        this._view.preloader.root.remove();

        this._renderTextHint();
        this._renderContinueButton();
        this._renderBackButton();
        this._view.removePreloader();
    }

    public _addAvaliableOptions() {
        const options = this._getAvaliableOptions();
        this._view.cameraSelector.removeAllOptions();
        options.forEach((option) => this._view.cameraSelector.addOption(option));
    }

    public _getAvaliableOptions() {
        return (this._model.videoSource.availableStreams ?? []).map(
            (camera) =>
                ({
                    label: camera.label,
                    value: camera.deviceId,
                    isSelected: camera.deviceId === this._model.videoSource.videoTrack?.settings.deviceId,
                }) as OptionsProps
        );
    }

    public _renderTextHint() {
        const text = this._services.localizator!.getLocalizedMessageByKey(
            'Stages.Initialization.SelectCamera.TextHints.CheckingWebcamOperation'
        );
        this._view.textHints.setText(text);
    }

    public _renderContinueButton() {
        const text = this._services.localizator!.getLocalizedMessageByKey(
            'Stages.Initialization.SelectCamera.ContinueButton'
        );
        this._view.continueButton.setText(text);
        this._view.setFooter(this._view.continueButton.root);
    }

    public _renderBackButton() {
        if (this._view.backButton === undefined) return;

        const text = this._services.localizator!.getLocalizedMessageByKey(
            'Stages.Initialization.SelectCamera.BackButton'
        );

        this._view.backButton.setText(text);
        this._view.setFooter(this._view.backButton.root);
    }

    public _waitForSubmit() {
        const { logger } = this._services;
        return new Promise((resolve, reject) => {
            this._view.continueButton.setHandleClick(() => {
                logger?.addDebugLog('Continue button from select camera stage has been pressed');
                resolve('ok');
            });

            this._view.backButton?.setHandleClick(() => {
                logger?.addDebugLog('Back button from select camera stage has been pressed');
                reject(new Error('Back'));
            });
        });
    }

    public destroy() {
        this._view.cameraSelector.destroy();
        this._view.relativeContainer.destroy();
        this._view.continueButton.destroy();
        this._view.backButton?.destroy();
        this._view.textHints.removeFromDom();
    }
}
