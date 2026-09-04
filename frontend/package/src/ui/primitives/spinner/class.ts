import './style.css';

export default class Spinner {
    public readonly root: SVGElement;
    public readonly circle: SVGCircleElement;

    constructor() {
        this.root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.root.classList.add('tdvc-spinner');
        this.root.setAttribute('viewBox', '25 25 50 50');

        this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.circle.classList.add('tdvc-spinner__circle');
        this.circle.setAttribute('cx', '50');
        this.circle.setAttribute('cy', '50');
        this.circle.setAttribute('r', '20');
        this.circle.setAttribute('fill', 'none');

        this.root.append(this.circle);
    }

    public destroy() {
        this.circle.remove();
        this.root.remove();
    }
}
