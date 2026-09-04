import { CanvasOptions, WebComponentError } from '../../../shared';

export type Options = Partial<CanvasOptions>;

export const DEFAULT_CANVAS_SETTINGS: Options = {
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
};

export default abstract class Canvas {
    protected _root: HTMLCanvasElement;
    protected _context: CanvasRenderingContext2D;
    protected _options: Options;
    protected _initialOptions: Options;

    constructor(id: string, options?: Options) {
        this._root = document.createElement('canvas');
        this._root.classList.add('tdvc-canvas');
        this._root.classList.add(id);

        const context = this.root.getContext('2d');
        if (!context) {
            const elementClasses = this._root.classList
                .keys()
                .reduce((prev, cur) => (prev === '' ? prev + cur : prev + ' ' + cur), '');
            throw new WebComponentError({ message: `2D context for ${elementClasses} is null` });
        }

        this._context = context;
        this._initialOptions = options ?? DEFAULT_CANVAS_SETTINGS;
        this.setContextOption({ ...this._initialOptions });
        this.applyContextOptions();
    }

    get root() {
        return this._root as Readonly<HTMLCanvasElement>;
    }

    get options() {
        return this._options;
    }

    get initialOptions() {
        return this._initialOptions;
    }

    setContextOption(options: Options) {
        this._options = options;
    }

    applyContextOptions() {
        if (this._options.strokeStyle) this._context.strokeStyle = this._options.strokeStyle;
        if (this._options.lineWidth) this._context.lineWidth = this._options.lineWidth;
        if (this._options.fillStyle) this._context.fillStyle = this._options.fillStyle;
    }

    setResolution(width: number, height: number) {
        this._root.width = width;
        this._root.height = height;
        this.applyContextOptions();
    }

    clear() {
        const { width, height } = this._context.canvas;
        this._context.clearRect(0, 0, width, height);
    }

    removeFromDom() {
        this._root.remove();
    }

    destroy() {
        if (this._root && this._root.parentNode) this._root.remove();
        this._context = null!;
    }
}
