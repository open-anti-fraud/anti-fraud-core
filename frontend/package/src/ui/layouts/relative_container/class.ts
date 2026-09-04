import './style.css';

export default class RelativeContainer {
    public readonly root: HTMLDivElement;

    constructor() {
        this.root = document.createElement('div');
        this.root.classList.add('tdvc-relative-container');
    }

    destroy() {
        this.root.remove();
    }
}
