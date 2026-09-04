import { Spinner } from '../../primitives';

import './style.css';

export default class Preloader {
    public readonly root: HTMLDivElement;
    public readonly spinner: Spinner;
    public readonly message: HTMLParagraphElement;

    constructor() {
        this.root = this._createContainer();
        this.spinner = new Spinner();
        this.message = this._createMessage();

        this.root.append(this.spinner.root, this.message);
    }

    private _createContainer() {
        const element = document.createElement('div');
        element.classList.add('tdvc-preloader');
        return element;
    }

    private _createMessage() {
        const element = document.createElement('p');
        element.classList.add('tdvc-preloader__text');
        return element;
    }

    public setMessage(message?: string) {
        this.message.textContent = message ?? '';
    }

    public destroy() {
        this.spinner.destroy();
        this.message.remove();
        this.root.remove();
    }
}
