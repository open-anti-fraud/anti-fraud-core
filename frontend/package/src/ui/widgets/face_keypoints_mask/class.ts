import { Point } from '../../../shared';
import { Canvas, Options } from '../../primitives';
import TRIANGULATION from './const';
import './style.css';

export type FaceKeypointsMaskOptions = Options;

export const DEFAULT_FACE_KEYPOINTS_MASK_OPTIONS: FaceKeypointsMaskOptions = {
    strokeStyle: '#32EEDB',
    fillStyle: '#32EEDB',
    lineWidth: 0.5,
};

export default class FaceKeypointsMask extends Canvas {
    protected _isRendering = false;

    constructor(options?: FaceKeypointsMaskOptions) {
        super('tdvc-face-keypoints-mask', options ?? DEFAULT_FACE_KEYPOINTS_MASK_OPTIONS);
    }

    get isRendering() {
        return this._isRendering;
    }

    draw(points: Point[]) {
        if (this._isRendering || points.length !== 478) return;

        this._isRendering = true;

        this._context.beginPath();

        for (let i = 0; i < TRIANGULATION.length; i += 3) {
            const a = points[TRIANGULATION[i]];
            const b = points[TRIANGULATION[i + 1]];
            const c = points[TRIANGULATION[i + 2]];

            this._context.moveTo(a.x, a.y);
            this._context.lineTo(b.x, b.y);
            this._context.lineTo(c.x, c.y);
        }

        this._context.stroke();
        this._isRendering = false;
    }
}
