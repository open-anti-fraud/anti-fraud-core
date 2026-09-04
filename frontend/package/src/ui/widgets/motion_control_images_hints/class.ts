import { MotionControlPattern } from '../../../shared';
import './style.css';

export default class MotionControlImagesHints {
    public left: HTMLImageElement;
    public right: HTMLImageElement;
    public up: HTMLImageElement;
    public closer: HTMLImageElement;
    public farther: HTMLImageElement;
    public return: HTMLImageElement;

    public isLoaded = false;

    public init(resourcesPath: string) {
        this.left = this._createImage('left', resourcesPath);
        this.right = this._createImage('right', resourcesPath);
        this.up = this._createImage('up', resourcesPath);
        this.closer = this._createImage('closer', resourcesPath);
        this.farther = this._createImage('farther', resourcesPath);
        this.return = this._createImage('return', resourcesPath);
        this.isLoaded = true;
    }

    private _createImage(type: MotionControlPattern | 'return', path: string) {
        const gifByAction: { [key in MotionControlPattern | 'return']: string } = {
            left: `${path}/left.gif`,
            right: `${path}/right.gif`,
            up: `${path}/up.gif`,
            closer: `${path}/closer.gif`,
            farther: `${path}/farther.gif`,
            return: `${path}/center.gif`,
        };

        const element = document.createElement('img');
        element.classList.add('tdvc-motion-control-image-hint');
        element.src = gifByAction[type];

        element.onload = () => {
            element.style.display = 'block';
        };

        element.onerror = () => {
            console.error(
                'Failed to retrieve image for Motion Control cues, check image path, server availability or proxy settings'
            );

            if (element.parentNode) element.remove();
        };

        return element;
    }

    public removeFromDom() {
        this.left?.remove();
        this.right?.remove();
        this.up?.remove();
        this.closer?.remove();
        this.farther?.remove();
        this.return?.remove();
    }

    public destroy() {
        this.removeFromDom();
    }
}
