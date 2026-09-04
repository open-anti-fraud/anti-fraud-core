import './style.css';

export type OptionsProps = {
    label: string;
    value: string;
    isSelected?: boolean;
};

export default class CameraSelector {
    public root: HTMLSelectElement;
    public options: HTMLOptionElement[] = [];

    constructor() {
        this.root = this._createSelector();
    }

    private _createSelector() {
        const element = document.createElement('select');
        element.classList.add('tdvc-camera-selector');
        return element;
    }

    get value(): string {
        return this.root.value;
    }

    public onChange(fn: (event: Event) => void) {
        this.root.onchange = fn;
    }

    public addOption(props: OptionsProps) {
        if (this.options.some((option) => option.value === props.value)) return;
        const element = document.createElement('option');
        element.value = props.value;
        element.textContent = props.label;
        element.selected = !!props.isSelected;
        element.classList.add(`tdvc-camera-selector__option`);
        this.options.push(element);
        this.root.append(element);
    }

    public removeOption(value: string) {
        const removingOption = this.options.find((option) => option.value === value);
        if (removingOption) {
            removingOption.remove();
            this.options = this.options.filter((option) => option !== removingOption);
        }
    }

    public removeAllOptions() {
        this.options.forEach((option) => {
            option.remove();
        });
        this.options = [];
    }

    public disable() {
        this.root.disabled = true;
    }

    public enable() {
        this.root.disabled = false;
    }

    destroy() {
        this.removeAllOptions();
        this.root.remove();
    }
}
