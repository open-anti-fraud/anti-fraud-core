import './style.css';

export default class SessionIdHint {
    public readonly root: HTMLSpanElement;

    constructor() {
        this.root = document.createElement('p');
        this.root.id = 'tdvc-session-id-hint';
        this.root.classList.add(this.root.id);
    }

    public setText(text?: string) {
        if (text === this.root.textContent) return;
        this.root.textContent = text ?? '';
    }

    public removeFromDom() {
        if (this.root && this.root.parentNode) this.root.remove();
    }

    public destroy() {
        this.removeFromDom();
    }
}
