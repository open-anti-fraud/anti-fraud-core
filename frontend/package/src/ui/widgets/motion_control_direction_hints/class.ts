import { Canvas, Options } from '../..';
import { BoundingBox, MotionControlPattern, Point, Resolution } from '../../../shared';

import './style.css';

export const DEFAULT_MOTION_CONTROL_DIRECTION_HINTS_OPTIONS = {
    lineWidth: 2,
    fillStyle: 'rgba(0, 0, 0, 0.5)',
    strokeStyle: 'rgba(169, 169, 169, 1)',
};

export default abstract class MotionControlDirectionHints extends Canvas {
    constructor(options?: Options) {
        super('tdv-motion-control-direction-hints', options ?? DEFAULT_MOTION_CONTROL_DIRECTION_HINTS_OPTIONS);
    }

    abstract draw(bbox: BoundingBox, command: MotionControlPattern | 'return', progress: number): void;
}

export class ArrowsMotionControlDirectionHints extends MotionControlDirectionHints {
    protected _leftArrow: Path2D = new Path2D();
    protected _rightArrow: Path2D = new Path2D();
    protected _upArrow: Path2D = new Path2D();
    protected _downArrow: Path2D = new Path2D();

    protected _baseMargin = 4;
    protected _gap = -4;
    protected _arrowResolution: Resolution = {
        width: 16,
        height: 21,
    };
    protected _halfArrowResolution: Resolution = {
        width: this._arrowResolution.width / 2,
        height: this._arrowResolution.height / 2,
    };

    protected _successArrowFillColor = '#17ea4c';
    protected _disabledArrowStrokeColor = 'rgba(255,255,255, 1)';
    protected _disabledArrowFillColor = `rgba(255, 255, 255, 0.5)`;

    constructor(options?: Options) {
        super(options);
        this._initLeftArrowPath();
        this._initRightArrowPath();
        this._initUpArrowPath();
        this._initDownArrowPath();
    }

    draw(bbox: BoundingBox, command: MotionControlPattern | 'return', progress = 0) {
        switch (command) {
            case 'left':
                this._drawHintForLeftAction(bbox, progress);
                break;
            case 'right':
                this._drawHintForRightAction(bbox, progress);
                break;
            case 'up':
                this._drawHintForUpAction(bbox, progress);
                break;
            case 'closer':
                this._drawHintForCloserAction(bbox, progress);
                break;
            case 'farther':
                this._drawHintForFartherAction(bbox, progress);
                break;
            default:
                break;
        }
    }

    protected _drawHintForLeftAction(bbox: BoundingBox, progress = 0) {
        let basePoint;

        for (let i = 0; i < 4; i++) {
            basePoint = this._getPointForRightPosition(bbox, i);
            this._renderArrow(this._rightArrow, basePoint, progress, i);

            basePoint = this._getPointForLeftPosition(bbox, i);
            this._renderArrow(this._leftArrow, basePoint, 0, i, true);

            basePoint = this._getPointForUpPosition(bbox, i);
            this._renderArrow(this._upArrow, basePoint, 0, i, true);

            basePoint = this._getPointForDownPosition(bbox, i);
            this._renderArrow(this._downArrow, basePoint, 0, i, true);
        }
    }

    protected _drawHintForRightAction(bbox: BoundingBox, progress = 0) {
        let basePoint;

        for (let i = 0; i < 4; i++) {
            basePoint = this._getPointForRightPosition(bbox, i);
            this._renderArrow(this._rightArrow, basePoint, 0, i, true);

            basePoint = this._getPointForLeftPosition(bbox, i);
            this._renderArrow(this._leftArrow, basePoint, progress, i);

            basePoint = this._getPointForUpPosition(bbox, i);
            this._renderArrow(this._upArrow, basePoint, 0, i, true);

            basePoint = this._getPointForDownPosition(bbox, i);
            this._renderArrow(this._downArrow, basePoint, 0, i, true);
        }
    }

    protected _drawHintForUpAction(bbox: BoundingBox, progress = 0) {
        let basePoint;
        for (let i = 0; i < 4; i++) {
            basePoint = this._getPointForRightPosition(bbox, i);
            this._renderArrow(this._rightArrow, basePoint, 0, i, true);

            basePoint = this._getPointForLeftPosition(bbox, i);
            this._renderArrow(this._leftArrow, basePoint, 0, i, true);

            basePoint = this._getPointForUpPosition(bbox, i);
            this._renderArrow(this._upArrow, basePoint, progress, i);

            basePoint = this._getPointForDownPosition(bbox, i);
            this._renderArrow(this._downArrow, basePoint, 0, i, true);
        }
    }

    protected _drawHintForCloserAction(bbox: BoundingBox, progress = 0) {
        let basePoint;
        for (let i = 0; i < 4; i++) {
            basePoint = this._getPointForRightPosition(bbox, i);
            this._renderArrow(this._leftArrow, basePoint, progress, i);

            basePoint = this._getPointForLeftPosition(bbox, i);
            this._renderArrow(this._rightArrow, basePoint, progress, i);

            basePoint = this._getPointForUpPosition(bbox, i);
            this._renderArrow(this._downArrow, basePoint, progress, i);

            basePoint = this._getPointForDownPosition(bbox, i);
            this._renderArrow(this._upArrow, basePoint, progress, i);
        }
    }

    protected _drawHintForFartherAction(bbox: BoundingBox, progress = 0) {
        let basePoint;
        for (let i = 0; i < 4; i++) {
            basePoint = this._getPointForRightPosition(bbox, i);
            this._renderArrow(this._rightArrow, basePoint, progress, i);

            basePoint = this._getPointForLeftPosition(bbox, i);
            this._renderArrow(this._leftArrow, basePoint, progress, i);

            basePoint = this._getPointForUpPosition(bbox, i);
            this._renderArrow(this._upArrow, basePoint, progress, i);

            basePoint = this._getPointForDownPosition(bbox, i);
            this._renderArrow(this._downArrow, basePoint, progress, i);
        }
    }

    protected _getPointForRightPosition(bbox: BoundingBox, index: number) {
        const offset = this._baseMargin + index * (this._gap + this._arrowResolution.width);
        return {
            x: bbox.xMax + offset,
            y: bbox.yMin + bbox.height / 2 - this._halfArrowResolution.height,
        };
    }

    protected _getPointForLeftPosition(bbox: BoundingBox, index: number) {
        const offset = this._baseMargin + index * (this._gap + this._arrowResolution.width);
        return {
            x: bbox.xMin - offset - this._arrowResolution.width,
            y: bbox.yMin + bbox.height / 2 - this._halfArrowResolution.height,
        };
    }

    protected _getPointForUpPosition(bbox: BoundingBox, index: number) {
        const offset = this._baseMargin + index * (this._gap + this._arrowResolution.width);
        return {
            x: bbox.xMin + bbox.width / 2 - this._halfArrowResolution.height,
            y: bbox.yMin - offset - this._arrowResolution.width,
        };
    }

    protected _getPointForDownPosition(bbox: BoundingBox, index: number) {
        const offset = this._baseMargin + index * (this._gap + this._arrowResolution.width);
        return {
            x: bbox.xMin + bbox.width / 2 - this._halfArrowResolution.height,
            y: bbox.yMax + offset,
        };
    }

    protected _renderArrow(arrow: Path2D, basePoint: Point, progress: number, arrowIndex: number, isDisabled = false) {
        this._context.save();
        this._setFillColor(progress, arrowIndex, isDisabled);
        this._context.translate(basePoint.x, basePoint.y);
        this._context.fill(arrow);
        this._context.stroke(arrow);
        this._context.restore();
    }

    protected _initLeftArrowPath() {
        this._leftArrow.moveTo(this._arrowResolution.width, 0);
        this._leftArrow.lineTo(this._halfArrowResolution.width, 0);
        this._leftArrow.lineTo(0, this._halfArrowResolution.height);
        this._leftArrow.lineTo(this._halfArrowResolution.width, this._arrowResolution.height);
        this._leftArrow.lineTo(this._arrowResolution.width, this._arrowResolution.height);
        this._leftArrow.lineTo(this._halfArrowResolution.width, this._halfArrowResolution.height);
        this._leftArrow.lineTo(this._arrowResolution.width, 0);
    }

    protected _initRightArrowPath() {
        this._rightArrow.moveTo(0, 0);
        this._rightArrow.lineTo(this._halfArrowResolution.width, 0);
        this._rightArrow.lineTo(this._arrowResolution.width, this._halfArrowResolution.height);
        this._rightArrow.lineTo(this._halfArrowResolution.width, this._arrowResolution.height);
        this._rightArrow.lineTo(0, this._arrowResolution.height);
        this._rightArrow.lineTo(this._halfArrowResolution.width, this._halfArrowResolution.height);
        this._rightArrow.lineTo(0, 0);
    }

    protected _initUpArrowPath() {
        this._upArrow.moveTo(0, this._arrowResolution.width);
        this._upArrow.lineTo(0, this._halfArrowResolution.width);
        this._upArrow.lineTo(this._halfArrowResolution.height, 0);
        this._upArrow.lineTo(this._arrowResolution.height, this._halfArrowResolution.width);
        this._upArrow.lineTo(this._arrowResolution.height, this._arrowResolution.width);
        this._upArrow.lineTo(this._halfArrowResolution.height, this._halfArrowResolution.width);
        this._upArrow.lineTo(0, this._arrowResolution.width);
    }

    protected _initDownArrowPath() {
        this._downArrow.moveTo(0, 0);
        this._downArrow.lineTo(0, this._halfArrowResolution.width);
        this._downArrow.lineTo(this._halfArrowResolution.height, this._arrowResolution.width);
        this._downArrow.lineTo(this._arrowResolution.height, this._halfArrowResolution.width);
        this._downArrow.lineTo(this._arrowResolution.height, 0);
        this._downArrow.lineTo(this._halfArrowResolution.height, this._halfArrowResolution.width);
        this._downArrow.lineTo(0, 0);
    }

    protected _setFillColor(progress: number, currentIndex: number, isDisabled: boolean) {
        const options = { ...this._initialOptions };

        if (!isDisabled && Math.floor(progress / 25) >= currentIndex + 1) {
            options.fillStyle = this._successArrowFillColor;
        }

        if (isDisabled) {
            options.fillStyle = this._disabledArrowFillColor;
            options.strokeStyle = this._disabledArrowStrokeColor;
        }

        this.setContextOption(options);
        this.applyContextOptions();
    }

    destroy(): void {
        this._leftArrow = undefined!;
        this._rightArrow = undefined!;
        this._upArrow = undefined!;
        this._downArrow = undefined!;
        super.destroy();
    }
}
