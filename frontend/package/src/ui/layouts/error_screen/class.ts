import './style.css';

export default class ErrorScreenLayout {
    public readonly root: HTMLDivElement;
    public readonly errorMessage: HTMLParagraphElement;
    protected id = 'tdvc-error';

    constructor() {
        this.root = this._createRootElement();
        this.errorMessage = this._createErrorMessage();
        this.root.append(this.errorMessage);
    }

    protected _createRootElement() {
        const element = document.createElement('div');
        element.id = this.id;
        element.classList.add(this.id);
        return element;
    }

    protected _createErrorMessage() {
        const element = document.createElement('p');
        const id = `${this.id}__error-message`;
        element.classList.add(id);
        return element;
    }

    public setErrorMessage(text?: string) {
        if (text === this.errorMessage.textContent) return;
        this.errorMessage.textContent = text ?? '';
    }

    destroy() {
        this.errorMessage.remove();
        this.root.remove();
    }
}
