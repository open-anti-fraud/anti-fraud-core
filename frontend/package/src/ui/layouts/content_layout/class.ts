import './style.css';

export default class ContentLayout {
    public readonly root: HTMLDivElement;

    public readonly header: HTMLDivElement;
    public readonly content: HTMLDivElement;
    public readonly footer: HTMLDivElement;

    constructor() {
        this.root = this._createRootElement();

        this.header = this._createHeaderElement();
        this.content = this._createContentElement();
        this.footer = this._createFooterElement();

        this.root.append(this.header, this.content, this.footer);
    }

    private _createRootElement() {
        const element = document.createElement('div');
        const id = 'tdvc-content';
        element.id = id;
        element.classList.add(id);
        return element;
    }

    private _createHeaderElement() {
        const element = document.createElement('header') as HTMLDivElement;
        element.classList.add('tdvc-content__header');
        return element;
    }

    private _createContentElement() {
        const element = document.createElement('main') as HTMLDivElement;
        const id = 'tdvc-content__body';
        element.id = id;
        element.classList.add(id);
        return element;
    }

    private _createFooterElement() {
        const element = document.createElement('footer') as HTMLDivElement;
        element.classList.add('tdvc-content__footer');
        return element;
    }

    public destroy() {
        this.header.remove();
        this.content.remove();
        this.footer.remove();
        this.root.remove();
    }
}
