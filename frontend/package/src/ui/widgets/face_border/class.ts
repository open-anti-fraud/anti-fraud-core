import { Point, Resolution } from '../../../shared';
import { Canvas, Options } from '../../primitives';
import './style.css';

export type FaceBorderOptions = Options;

export const DEFAULT_FACE_BORDER_OPTIONS: FaceBorderOptions = {
    strokeStyle: '#ffffff',
    fillStyle: 'rgba(255, 255, 255, 0.5)',
    lineWidth: 4,
};

export default abstract class FaceBorder extends Canvas {
    constructor(options?: FaceBorderOptions) {
        super('tdvc-face-position-circle', options ?? DEFAULT_FACE_BORDER_OPTIONS);
    }

    public draw(point: Point, resolution: Resolution) {
        this._drawOverlay();
        this._clearFaceArea(point, resolution);
        this._drawBorder(point, resolution);
    }

    protected _drawOverlay() {
        this._context.globalCompositeOperation = 'overlay';
        this._context.fillRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    }

    protected _clearFaceArea(point: Point, resolution: Resolution) {
        this._context.globalCompositeOperation = 'destination-out';
        this._context.fillStyle = 'rgba(0,0,0,1.0)';
        this._baseFigure(point, resolution, (this._options?.lineWidth ?? 4) / 2);
        this._context.fill();
    }

    protected _drawBorder(point: Point, resolution: Resolution) {
        this._context.beginPath();
        this._context.globalCompositeOperation = 'overlay';
        this._baseFigure(point, resolution, 0);
        this._context.stroke();
    }

    protected abstract _baseFigure(point: Point, resolution: Resolution, borderWidth: number): void;
}

export class EllipseFaceBorder extends FaceBorder {
    constructor(options?: FaceBorderOptions) {
        super(options ?? DEFAULT_FACE_BORDER_OPTIONS);
    }

    protected _baseFigure(point: Point, resolution: Resolution, borderWidth: number): void {
        const { rx, ry } = this._calculateEllipseRadiuses(resolution);
        this._context.ellipse(point.x, point.y, rx + borderWidth, ry + borderWidth, 0, 0, 2 * Math.PI);
    }

    protected _calculateEllipseRadiuses(resolution: Resolution) {
        return {
            rx: resolution.width / 2,
            ry: resolution.height / 2,
        };
    }
}

export class RoundedSquareFaceBorder extends FaceBorder {
    constructor(options?: FaceBorderOptions) {
        super(options ?? DEFAULT_FACE_BORDER_OPTIONS);
    }

    protected _baseFigure(point: Point, resolution: Resolution, borderWidth = 0) {
        const offset = Math.floor((resolution.width / 100) * 16);

        const { topLeftCorner, bottomLeftCorner, bottomRightCorner, topRightCorner } =
            this._calculateRectCornerCoordinates(point, resolution, borderWidth);

        this._context.moveTo(topLeftCorner.x, topLeftCorner.y + offset);

        this._context.quadraticCurveTo(topLeftCorner.x, topLeftCorner.y, topLeftCorner.x + offset, topLeftCorner.y);
        this._context.lineTo(topRightCorner.x - offset, topRightCorner.y);

        this._context.quadraticCurveTo(topRightCorner.x, topRightCorner.y, topRightCorner.x, topRightCorner.y + offset);
        this._context.lineTo(bottomRightCorner.x, bottomRightCorner.y - offset);

        this._context.quadraticCurveTo(
            bottomRightCorner.x,
            bottomRightCorner.y,
            bottomRightCorner.x - offset,
            bottomRightCorner.y
        );
        this._context.lineTo(bottomLeftCorner.x + offset, bottomRightCorner.y);

        this._context.quadraticCurveTo(
            bottomLeftCorner.x,
            bottomLeftCorner.y,
            bottomLeftCorner.x,
            bottomLeftCorner.y - offset
        );
        this._context.closePath();
    }

    protected _calculateRectCornerCoordinates(point: Point, resolution: Resolution, borderWidth = 0) {
        const topLeftCorner: Point = {
            x: point.x - resolution.width / 2 - borderWidth,
            y: point.y - resolution.height / 2 - borderWidth,
        };

        const topRightCorner: Point = {
            x: point.x + resolution.width / 2 + borderWidth,
            y: point.y - resolution.height / 2 - borderWidth,
        };

        const bottomRightCorner: Point = {
            x: point.x + resolution.width / 2 + borderWidth,
            y: point.y + resolution.height / 2 + borderWidth,
        };

        const bottomLeftCorner: Point = {
            x: point.x - resolution.width / 2 - borderWidth,
            y: point.y + resolution.height / 2 + borderWidth,
        };

        return {
            topLeftCorner,
            topRightCorner,
            bottomRightCorner,
            bottomLeftCorner,
        };
    }
}
