import { ImageAPI } from '../../domain/image_api';
import { Services, View } from '../../modes/_core';
import Model from '../../modes/lite/model';
import { convertImageBitmapToBlob, dataURLtoBlob, Stage, WebComponentError } from '../../shared';
import {
    InvalidOriginBlobError,
    NoFaceOnBestshotError,
    NoFaceOnOriginalPhotoError,
    TooManyFacesOnBestshotsError,
    TooManyFacesOnOriginalPhotoError,
} from './errors';

export type Props = {
    view: View;
    model: Model;
    services: Services;
};

export default class FaceMatchingStage implements Stage {
    name = 'FaceMatchingStage';

    private _model: Model;
    private _view: View;
    private _services: Services;

    constructor(props: Props) {
        this._model = props.model;
        this._view = props.view;
        this._services = props.services;
    }

    public async run() {
        const { localizator } = this._services;
        const { mergedConfiguration, bestshots } = this._model;
        const bestshot = bestshots?.bestshot;

        this._view.setPreloader(localizator?.getLocalizedMessageByKey('Stages.ValidateFlowResult.SendingDataToServer'));

        let bestshotBlob;
        let verificationResult;

        if (bestshot !== undefined && mergedConfiguration.applicantPhoto !== undefined) {
            bestshotBlob = await convertImageBitmapToBlob(
                bestshot,
                mergedConfiguration.clientServerConnectionSettings.referenceFrameQuality
            );

            verificationResult = await this._verification(bestshotBlob, mergedConfiguration.applicantPhoto);
            this._model.verificationResult = verificationResult?.verification;

            fetch(`lrs/add_verification_frame_info/${this._model.endeavor!.id!}`, {
                method: 'POST',
                headers: {
                    Token: `token`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this._model.verificationResult),
            });
        }

        this._view?.removePreloader();
    }

    private async _verification(bestshotBlob: Blob, applicantPhoto: string) {
        const { logger } = this._services;

        let originBlob;

        try {
            originBlob = await dataURLtoBlob(applicantPhoto!);
        } catch (err) {
            logger?.addCriticalErrorLog(`Invalid origin blob ${(err as Error).message}`);
            throw new InvalidOriginBlobError();
        }

        const templates = await Promise.all([
            this._extractOriginTemplate(originBlob),
            this._extractBestshotTemplate(bestshotBlob),
        ]);

        const response = await ImageAPI.match({
            objects: templates,
        });

        return response;
    }

    private async _extractOriginTemplate(blob: Blob) {
        try {
            return await this._extractTemplate(blob);
        } catch (err) {
            const message = (err as Error).message;
            if (message === 'No faces') throw new NoFaceOnOriginalPhotoError();
            if (message === 'Too many faces') throw new TooManyFacesOnOriginalPhotoError();
            throw new WebComponentError({ message });
        }
    }

    private async _extractBestshotTemplate(blob: Blob) {
        try {
            return await this._extractTemplate(blob);
        } catch (err) {
            const message = (err as Error).message;
            if (message === 'No faces') throw new NoFaceOnBestshotError();
            if (message === 'Too many faces') throw new TooManyFacesOnBestshotsError();
            throw new WebComponentError({ message });
        }
    }

    private async _extractTemplate(blob: Blob) {
        const { mergedConfiguration } = this._model;
        const { baseUrl, authenticationToken } = mergedConfiguration;

        ImageAPI.setToken(authenticationToken);
        ImageAPI.setBaseUrl(baseUrl);

        const faceDetectionFaceFitterResult = await ImageAPI.faceDetectorFaceFitterApi(blob);
        if (faceDetectionFaceFitterResult.objects.length === 0) throw new Error('No faces');
        if (faceDetectionFaceFitterResult.objects.length > 1) throw new Error('Too many faces');

        const extractTemplateResult = await ImageAPI.extractTemplate({
            ...faceDetectionFaceFitterResult,
            objects: [faceDetectionFaceFitterResult.objects[0]],
        });

        return extractTemplateResult.objects[0];
    }

    public destroy() {
        this._view?.removePreloader();
    }
}
