import './style.css';

export default class ValidationFlowVerdict {
    public root: HTMLParagraphElement;

    constructor() {
        this.root = document.createElement('p');
        this.root.classList.add('tdvc-validation-flow-verdict');
    }

    public setText(text?: string) {
        if (text === this.root.textContent) return;
        this.root.textContent = text ?? '';
    }

    public removeFromDom() {
        if (this.root?.parentNode) this.root.remove();
    }

    destroy() {
        this.removeFromDom();
        this.root = undefined!;
    }
}
