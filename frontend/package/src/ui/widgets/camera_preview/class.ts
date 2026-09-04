import './style.css';

export default class CameraPreview {
    private _root: HTMLVideoElement;

    constructor() {
        const element = document.createElement('video');
        element.id = 'tdvc-camera-preview';
        element.classList.add(element.id);

        element.muted = true;
        element.defaultMuted = true;
        element.playsInline = true;
        element.controls = false;
        element.disablePictureInPicture = true;

        element.setAttribute('muted', '');
        element.setAttribute('playsinline', '');
        element.setAttribute('webkit-playsinline', '');

        this._root = element;
    }

    get root() {
        return this._root as Readonly<HTMLVideoElement>;
    }

    public getPreviewResolution() {
        return {
            width: this._root.offsetWidth,
            height: this._root.offsetHeight,
        };
    }

    public getVideoResolution() {
        return {
            width: this._root.videoWidth,
            height: this._root.videoHeight,
        };
    }

    public async play() {
        if (!this._root.paused) return;
        await this._root.play();
    }

    public stop() {
        this._root.pause();
    }

    public setVideoSource(source: MediaStream) {
        this._root.srcObject = source;
    }

    public clearSrc() {
        this._root.srcObject = null;
    }

    public destroy() {
        this.stop();
        this.clearSrc();
        if (this._root.parentNode) this._root.remove();
    }
}
