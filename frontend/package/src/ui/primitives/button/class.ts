import './style.css';

export default class Button {
    public readonly root: HTMLButtonElement;
    private _text: string = '';

    constructor() {
        this.root = document.createElement('button');
        this.root.classList.add('tdvc-button');
    }

    setText(text?: string) {
        if (text === this.root.textContent) return;
        this._text = text ?? ' ';
        this.root.textContent = this._text;
    }

    setHandleClick(fn: () => void | Promise<void>) {
        this.root.onclick = async (event: Event) => {
            event.preventDefault();

            try {
                this.disable();
                this.root.classList.add('tdvc-button_loading');
                this.root.textContent = '';

                await fn();
            } finally {
                this.root.textContent = this._text;
                this.enable();
                this.root.classList.remove('tdvc-button_loading');
            }
        };
    }

    disable() {
        this.root.disabled = true;
    }

    enable() {
        this.root.disabled = false;
    }

    removeFromDom() {
        this.root.remove();
        this.root.onclick = null;
    }

    destroy() {
        this.removeFromDom();
    }
}
