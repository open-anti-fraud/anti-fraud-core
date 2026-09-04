import { FormField, FormFieldProps } from '../form_field';

import './style.css';

export default class IdentifyApplicantForm {
    public readonly root: HTMLFormElement;
    private _fields: FormField[] = [];

    constructor(fieldsData: FormFieldProps[]) {
        this.root = this._createForm();
        this._createFields(fieldsData);
        this._appendFieldsToForm();
    }

    private _createForm() {
        const element = document.createElement('form');
        const id = 'tdvc-identify-applicant-form';
        element.id = id;
        element.classList.add(id);
        element.onsubmit = (event: Event) => event.preventDefault();
        return element;
    }

    public addFields(fieldsData: FormFieldProps[]) {
        this._createFields(fieldsData);
        this._appendFieldsToForm();
    }

    private _createFields(fieldsData: FormFieldProps[]) {
        fieldsData.forEach((item) => this._fields.push(new FormField(item)));
    }

    private _appendFieldsToForm() {
        const items = this._fields.map((item) => item.root);
        this.root.append(...items);
    }

    get fields(): ReadonlyArray<FormField> {
        return [...this._fields];
    }

    public destroy() {
        this.removeFields();
        this._fields = [];
        this.root.remove();
    }

    public removeFields() {
        this._fields.forEach((item) => item.destroy());
        this._fields = [];
    }
}
