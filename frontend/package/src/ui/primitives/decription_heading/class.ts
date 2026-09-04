import './style.css';

export default class DescriptionHeading {
    public readonly root: HTMLParagraphElement;

    constructor() {
        this.root = document.createElement('p');
        this.root.classList.add('tdvc-flow-description-heading');
    }

    public setText(text?: string) {
        if (text === this.root.textContent) return;
        this.root.textContent = text ?? '';
    }

    destroy() {
        this.root.remove();
    }
}
