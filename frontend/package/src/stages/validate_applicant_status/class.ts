import {
    Applicant,
    ApplicantNotFoundError,
    getEnabledApplicantFields,
    getPrimaryEnabledApplicantFields,
} from '../../domain';
import { ApplicantFieldsFormValidator, applicantFieldsFormValidatorFactory } from '../../infrastructure';
import { ApplicantFieldNames, InvalidTokenError, Stage, WebComponentError } from '../../shared';
import { FormField } from '../../ui';

import { Model, Services, View } from '../../modes/_core';
import { labelTextMap, typeMap } from './consts';

export type ValidateApplicantStatusStageProps = {
    view: View;
    model: Model;
    services: Services;
};

export default class ValidateApplicantStatusStage implements Stage {
    public name = 'ValidateApplicantStatusStage';

    private _view: View;
    private _model: Model;
    private _services: Services;

    private _applicantFieldsFormValidator: ApplicantFieldsFormValidator;

    constructor(props: ValidateApplicantStatusStageProps) {
        this._view = props.view;
        this._model = props.model;
        this._services = props.services;

        this._applicantFieldsFormValidator = applicantFieldsFormValidatorFactory();

        const fields = this._getFieldData();
        this._view.identifyApplicantForm.addFields(fields);
        this._addFieldValidations();
    }

    private _getFieldData() {
        const { applicantFields } = this._model.mergedConfiguration;
        const enabledFields = getEnabledApplicantFields(applicantFields);

        const { localizator } = this._services;
        const baseLocazlizationKey = 'Stages.Initialization.IdentifyApplicantStatus.FormFields.Labels';

        return enabledFields.map((name) => ({
            id: name,
            labelText: localizator!.getLocalizedMessageByKey(`${baseLocazlizationKey}.${labelTextMap[name]}`),
            type: typeMap[name],
            value: '',
        }));
    }

    private _addFieldValidations() {
        this._view.identifyApplicantForm.fields.forEach((field) => {
            let validateTimerId: NodeJS.Timeout | undefined;

            const starTimer = (value: string) => {
                validateTimerId = setTimeout(() => {
                    this._validateAndShowError(field, value);
                    validateTimerId = undefined;
                }, 300);
            };

            const stopTimer = () => {
                if (validateTimerId) {
                    clearTimeout(validateTimerId);
                    validateTimerId = undefined;
                }
            };

            field.onInput((event: Event) => {
                stopTimer();
                event.preventDefault();
                const value = (event.target as HTMLInputElement)?.value;
                field.removeError();
                starTimer(value);
            });

            field.onBlur((event: Event) => {
                stopTimer();
                event.preventDefault();
                const value = (event.target as HTMLInputElement)?.value;
                this._validateAndShowError(field, value);
            });
        });
    }

    private async _validateAndShowError(field: FormField, value: string) {
        const result = await this._applicantFieldsFormValidator.validateField(
            field.fieldId as ApplicantFieldNames,
            value
        );

        if (!result.valid && result.error) {
            const baseLocazlizationKey = 'Stages.Initialization.IdentifyApplicantStatus.FormFields.Errors';
            const text = this._services.localizator!.getLocalizedMessageByKey(
                `${baseLocazlizationKey}.${result.error}`
            );
            field.setError(text);
        } else {
            field.removeError();
        }
        this._updateSubmitButtonAccess();
    }

    private _updateSubmitButtonAccess() {
        const hasInvalidFields = this._view.identifyApplicantForm.fields.some((f) => f.errorMessage.textContent !== '');
        if (hasInvalidFields) this._view.continueButton.disable();
        else this._view.continueButton.enable();
    }

    async run() {
        const { mode, mergedConfiguration } = this._model;
        const { applicantId, applicantFields } = mergedConfiguration;
        const { applicantDatabaseApi, logger } = this._services;

        let findApplicant: () => Promise<Applicant>;
        if (applicantId) {
            findApplicant = () => {
                logger?.addDebugLog(`Search applicant by applicantId: ${applicantId} starting`);
                const applicant = applicantDatabaseApi!.getById(applicantId);
                logger?.addDebugLog(`Search applicant by applicantId has been finished`);
                return applicant;
            };
        } else {
            findApplicant = () => {
                const primaryKey = getPrimaryEnabledApplicantFields(applicantFields)[0];
                const value = this._view.identifyApplicantForm.fields.find((field) => field.fieldId === primaryKey)!
                    .input.value;
                let data = `${primaryKey}==${value}`;

                logger?.addDebugLog(`Search applicant by fields: ${data}`);


                data = data.replace(/\=/g, '%3D'); // = → %3D
                data = data.replace(/ /g, '%20');
                data = data.replace(/\+/g, '%2B'); // + → %2B

                logger?.addDebugLog(`After serialization: ${data}`);

                const applicant = applicantDatabaseApi!.getByPrimaryField(data);
                logger?.addDebugLog(`Search applicant by fields has been finished`);

                return applicant;
            };
        }

        const fn = mode === 'registration' && !applicantId ? () => this.findOrCreate(findApplicant) : findApplicant;

        if (applicantId) {
            const applicant = await fn();
            logger?.addDebugLog(`Applicant has id ${applicant.id} and status ${applicant.status}`);

            this._callOnIdentifyApplicantStatusCallback(applicant.id, applicant.status);

            this._validate(applicant);
            this._model.applicant = applicant;
            return;
        }

        this._prepareView(mode === 'registration' ? 'Registration' : 'Authorization');
        this._view.removePreloader();

        return this._waitForSubmit(fn);
    }

    private async findOrCreate(findApplicant: () => Promise<Applicant>) {
        try {
            try {
                return await findApplicant();
            } catch (err) {
                const { logger, applicantDatabaseApi } = this._services;
                logger?.addWarningLog(`An error occurred while trying to find a candidate: ${(err as Error).message}`);

                if ((err as Error).name == InvalidTokenError.ERROR_NAME) throw err;

                logger?.addDebugLog(`Preparing data for create applicant`);
                const formData = new FormData(this._view.identifyApplicantForm.root);
                const entries = Array.from(formData.entries());
                logger?.addDebugLog(`Preparing data for create applicant has been finished`);
                logger?.addDebugLog(`Data: ${entries}`);

                logger?.addDebugLog(`Creating applicant`);
                const applicant = await applicantDatabaseApi!.create(entries);
                logger?.addDebugLog(`Applicant has been created`);

                return applicant;
            }
        } catch (err) {
            if (err instanceof WebComponentError) throw err;
            throw new ApplicantNotFoundError();
        }
    }

    private _validate(applicant: Applicant) {
        const { mode } = this._model;
        const { logger } = this._services;
        applicant.validateApplicantStatus(mode);
        logger?.addDebugLog(`Applicant status has been validated`);
    }

    private _prepareView(mode: 'Registration' | 'Authorization'): void {
        const { localizator } = this._services;

        this._view.contentLayout.content.append(this._view.identifyApplicantForm.root);
        const id = `Stages.Initialization.IdentifyApplicantStatus.SubmitButton.${mode}`;
        const localizedButtonText = localizator!.getLocalizedMessageByKey(id);
        this._view.continueButton.setText(localizedButtonText);
        this._view.setFooter(this._view.continueButton.root);
    }

    private _waitForSubmit(findApplicant: () => Promise<Applicant>) {
        return new Promise((resolve, reject) => {
            this._view.continueButton.setHandleClick(async () => {
                try {
                    const { logger } = this._services;
                    logger?.addDebugLog(`Submit button from validate applicant status has been pressed`);

                    const fields = this._view.identifyApplicantForm.fields;
                    for (const field of fields) await this._validateAndShowError(field, field.input.value);
                    const hasInvalidFields = fields.some((field) => field.errorMessage.textContent !== '');
                    if (hasInvalidFields) return;

                    const applicant = await findApplicant();
                    if (logger) logger.applicantId = applicant.id;
                    logger?.addDebugLog(`Applicant has id ${applicant.id} and status ${applicant.status}`);

                    this._callOnIdentifyApplicantStatusCallback(applicant.id, applicant.status);
                    this._validate(applicant);
                    this._model.applicant = applicant;
                    resolve('ok');
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    private _callOnIdentifyApplicantStatusCallback(applicantId: string, status: number) {
        const callback = this._model.mergedConfiguration.callbacks?.onIdentifyApplicantStatus;
        if (callback && typeof callback === 'function') callback({ applicantId, status });
    }

    destroy() {
        this._view.identifyApplicantForm.destroy();
        this._view.continueButton.destroy();
    }
}
