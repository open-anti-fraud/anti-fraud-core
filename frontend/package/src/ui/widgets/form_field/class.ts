import './style.css';

export type FormFieldProps = {
    id: string;
    labelText: string;
    type: string;
    value: string;
};

export default class FormField {
    public readonly root: HTMLDivElement;
    public readonly label: HTMLLabelElement;
    public readonly inputWrapper: HTMLDivElement;
    public readonly input: HTMLInputElement;
    public readonly icon: HTMLDivElement;
    public readonly errorMessage: HTMLParagraphElement;
    public readonly fieldId: string;

    constructor(props: FormFieldProps) {
        this.root = this._createContainer();
        this.label = this._createLabel(props.id, props.labelText);

        this.inputWrapper = this._createInputWrapper();
        this.fieldId = props.id;
        this.input = this._createInput(props.type, props.value);
        this.icon = this._createIcon();

        this.errorMessage = this._createErrorMessage();

        this.inputWrapper.append(this.icon, this.input);
        this.root.append(this.label, this.inputWrapper, this.errorMessage);
    }

    private _createContainer() {
        const element = document.createElement('div');
        element.classList.add('tdvc-form-field');
        return element;
    }

    private _createLabel(forId: string, text: string) {
        const element = document.createElement('label');
        element.classList.add('tdvc-form-field__label');
        element.setAttribute('for', forId);
        element.textContent = text;
        return element;
    }

    private _createInputWrapper() {
        const element = document.createElement('div');
        element.classList.add('tdvc-form-field__input-wrapper');
        return element;
    }

    private _createIcon() {
        const element = document.createElement('div');
        element.classList.add('tdvc-form-field__icon');
        return element;
    }

    public onInput(fn: (event: Event) => void) {
        this.input.oninput = fn;
    }

    public onBlur(fn: (event: Event) => void) {
        this.input.onblur = fn;
    }

    private _createInput(type: string, value: string) {
        const element = document.createElement('input');
        element.classList.add('tdvc-form-field__input');
        element.id = this.fieldId;
        element.name = this.fieldId;
        element.type = type;
        element.value = value;
        return element;
    }

    private _createErrorMessage() {
        const element = document.createElement('p');
        element.classList.add('tdvc-form-field__error-message');
        return element;
    }

    public setError(text: string) {
        this.input.setAttribute('aria-invalid', 'true');
        this.errorMessage.textContent = text;
    }

    public removeError() {
        this.input.removeAttribute('aria-invalid');
        this.errorMessage.textContent = '';
    }

    public destroy() {
        this.label.remove();
        this.icon.remove();
        this.input.remove();
        this.inputWrapper.remove();
        this.errorMessage.remove();
        this.root.remove();
    }
}
