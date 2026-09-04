import { AxiosError } from 'axios';
import { TApiError } from 'tdvc';
import {
    LivenessDetail,
    MatchingDetail,
    QualityDetail,
    TValidateApplicantResult,
} from 'tdvc/dist/types/validate-applicant.type';
import {
    ApplicantBlockedError,
    InvalidFacesAmountOnFrameError,
    serializeObject,
    Stage,
    TransportError,
    ValidationResult,
    WebComponentError,
} from '../../shared';

import {
    AntispoofingValidationError,
    ApplicantInBlackListError,
    ApplicantRiskError,
    AuthorizationMatchingFailedError,
    DeepfakeValidationError,
    InvalidEndeavorInfoError,
    LowImageQualityError,
    RegistrationMatchingFailedError,
    ValidationTimeHasExpiredError,
} from './errors';

import { Model, Services, View } from '../../modes/_core';

export type Props = {
    view: View;
    model: Model;
    services: Services;
};

export default class ValidateFlowResultStage implements Stage {
    name = 'ValidateFlowResultStage';

    private _model: Model;
    private _view: View;
    private _services: Services;

    constructor(props: Props) {
        this._model = props.model;
        this._view = props.view;
        this._services = props.services;
    }

    async run() {
        const { localizator } = this._services;

        try {
            const message = localizator!.getLocalizedMessageByKey('Stages.ValidateFlowResult.SendingDataToServer');
            this._view.setPreloader(message);
            await this._validate();
            this._view.removePreloader();
        } catch (err) {
            throw this._handleError(err);
        }
    }

    private _handleError(err: unknown) {
        if (err instanceof TransportError && err.code === '116002') return new InvalidFacesAmountOnFrameError();
        return err;
    }

    public async _validate() {
        let dataRequest: TValidateApplicantResult | undefined;
        const { localizator, applicantDatabaseApi, logger } = this._services;

        try {
            logger?.addDebugLog('Validating attempt on server has been starting');
            dataRequest = await applicantDatabaseApi!.validateApplicant(
                this._model.applicant!.id!,
                this._model.attempt!.id!,
                this._model.mergedConfiguration
            );
            logger?.addDebugLog('Validating attempt on server  has been finished');
            logger?.addDebugLog(`Validation result: ${serializeObject(dataRequest)}`);

            if (dataRequest) {
                const mode = this._model.mode === 'registration' ? 'Register' : 'Authorize';
                const message = localizator!.getLocalizedMessageByKey(`Stages.ValidateFlowResult.Success.${mode}`);

                this._view.validationFlowVerdict.setText(message);
                this._view.contentLayout.content.append(this._view.validationFlowVerdict.root);

                this._callOnValidateCallbackIfExist(dataRequest);
                this._validateResponseStatus(dataRequest);
                logger?.addDebugLog('Attempt was successfully finished');
                await this._services.logger?.flush();
            }

            logger?.addDebugLog('Validating attempt has been finished');
        } catch (error) {
            this.destroy();

            if (error instanceof WebComponentError) throw error;
            const responseStatus = (error as AxiosError).response?.status;

            if (responseStatus && responseStatus >= 500) {
                throw new WebComponentError({
                    message: 'ServerError',
                    code: '120018',
                });
            } else if (responseStatus && responseStatus >= 400) {
                const { code } = (error as AxiosError).response?.data as { code: string };
                const { message } = (error as AxiosError).response?.data as { message: string };

                logger?.addWarningLog(`Data code: ${code} and message: ${message}`);

                if (code && code === '1150003') throw new ValidationTimeHasExpiredError();
                if (code && code === '120040') throw new ApplicantBlockedError();

                throw new WebComponentError({
                    message: message || 'ServerConfigError',
                    code: code || '120019',
                });
            } else {
                const parsedError = this._getErrorText(error as TApiError);

                throw new WebComponentError({
                    message: parsedError.errorKey,
                    code: parsedError.code,
                });
            }
        }
    }

    private _validateResponseStatus(responseData: TValidateApplicantResult) {
        const { logger } = this._services;

        logger?.addDebugLog('Validation attempt on front has been started');
        if (responseData.invalidDataErrors.length > 0) {
            const name =
                responseData.invalidDataErrors[0].description ??
                responseData.invalidDataErrors[0].message ??
                'Invalid endeavor info';
            const code = responseData.invalidDataErrors[0].code ?? '120013';
            throw new InvalidEndeavorInfoError(name, code);
        } else {
            const { liveness, matching, quality } = responseData.validations;
            this._checkLivenessResult(liveness.details);
            this._checkMatchingResult(matching.details);
            this._checkQualityResult(quality.details);
            if (responseData.validationStatus.hasBeenBlackListed) throw new ApplicantInBlackListError();
            if (responseData.hasRiskEvents) throw new ApplicantRiskError();
        }
        logger?.addDebugLog('Validation attempt on front has been finished');
    }

    private _checkLivenessResult(data: LivenessDetail[] | null) {
        const error = this._findValidationErorr(data);
        if (!error) return;

        if (error.name === 'FaceLiveness') throw new AntispoofingValidationError();
        if (error.name === 'DeepFake') throw new DeepfakeValidationError();

        throw new WebComponentError({
            message: error.name,
        });
    }

    private _findValidationErorr(data: Array<LivenessDetail | MatchingDetail | QualityDetail> | null) {
        return (data ?? []).find((item) => item.verdict === false);
    }

    private _checkMatchingResult(data: MatchingDetail[] | null) {
        const error = this._findValidationErorr(data);
        if (!error) return;

        if (error.name === 'FaceMatching') {
            if (this._isRegistrationMode()) throw new RegistrationMatchingFailedError();
            throw new AuthorizationMatchingFailedError();
        }
        throw new WebComponentError({
            message: error.name,
        });
    }

    private _isRegistrationMode() {
        return this._model.mode === 'registration';
    }

    private _checkQualityResult(data: QualityDetail[] | null) {
        const error = this._findValidationErorr(data);
        if (!error) return;

        if (error.name === 'FaceQuality') throw new LowImageQualityError();

        throw new WebComponentError({
            message: error.name,
        });
    }

    private _callOnValidateCallbackIfExist(data: unknown) {
        const { logger } = this._services;
        const callback = this._model.mergedConfiguration.callbacks?.onValidate;
        if (callback && typeof callback === 'function') {
            logger?.addDebugLog('onValidate callback calling');
            callback(data as ValidationResult);
        }
    }

    private _getErrorText(error: TApiError): { errorKey: string; code: string } {
        const ERRORS_KEY: { [x: string]: { errorKey: string; code: string } } = {
            'More than one face detected': { errorKey: 'MoreFaces', code: '120017' },
            'No faces found': { errorKey: 'NoFacesFound', code: '120016' },
            'Face antispoofing was detected.': { errorKey: 'AntispoofingValidationError', code: '120012' },
            "Found faces don't belong to the applicant.": { errorKey: 'FacesDontBelongApplicant', code: '120015' },
        };

        if ('response' in error) {
            // @ts-ignore
            const multipleErrors = error.response?.data.multipleErrors ?? [];
            // @ts-ignore
            const messageError = error.response?.data.message ?? undefined;
            if (multipleErrors && multipleErrors.length > 0) {
                const errKey: string = multipleErrors[0].message ?? '';
                if (errKey.includes('Low image quality.')) return { errorKey: 'LowImageQuality', code: '120010' };
                return errKey ? ERRORS_KEY[errKey] : { errorKey: 'SomeError', code: '120014' };
            }
            if (messageError) {
                if (messageError.includes('Low image quality.')) return { errorKey: 'LowImageQuality', code: '120010' };
                return ERRORS_KEY[messageError] ?? { errorKey: 'SomeError', code: '120014' };
            }
            return { errorKey: 'SomeError', code: '120014' };
        }
        return { errorKey: 'SomeError', code: '120014' };
    }

    public destroy() {
        this._view.validationFlowVerdict?.removeFromDom();
    }
}
