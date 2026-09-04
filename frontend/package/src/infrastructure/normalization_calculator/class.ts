import {
    InvalidVideoPreviewResolutionValueError,
    InvalidVideoStreamResolutionValueError,
    Resolution,
} from '../../shared';
import { CoordinatesOffset, NormalizationCoefficients, ObjectFit } from './types';

export default class NormalizationCalculator {
    private _normalizationCoefficients: Readonly<NormalizationCoefficients>;
    private _coordinatesOffset: Readonly<CoordinatesOffset>;

    constructor() {
        this._normalizationCoefficients = { x: 1, y: 1 };
        this._coordinatesOffset = { x: 0, y: 0 };
    }

    get normalizationCoefficients() {
        return this._normalizationCoefficients;
    }

    get coordinatesOffset() {
        return this._coordinatesOffset;
    }

    public calculate(previewResolution: Resolution, streamResolution: Resolution, mode: ObjectFit = 'auto') {
        const { width: camW, height: camH } = streamResolution;
        const { width: prevW, height: prevH } = previewResolution;

        if (!camW || !camH) throw new InvalidVideoStreamResolutionValueError();
        if (!prevW || !prevH) throw new InvalidVideoPreviewResolutionValueError();

        const videoRatio = camW / camH;
        const previewRatio = prevW / prevH;
        const scaleX = prevW / camW;
        const scaleY = prevH / camH;

        const objectFit = this._resolveObjectFit(mode, scaleX, scaleY);

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (objectFit === 'cover' || objectFit === 'contain') {
            scale = objectFit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
            offsetX = (camW * scale - prevW) / 2;
            offsetY = (camH * scale - prevH) / 2;

            if (objectFit === 'cover' && videoRatio > previewRatio) offsetY = 0;
            if (objectFit === 'cover' && videoRatio <= previewRatio) offsetX = 0;
        }

        this._normalizationCoefficients = {
            x: scale,
            y: scale,
        };

        this._coordinatesOffset = {
            x: offsetX,
            y: offsetY,
        };
    }

    public _resolveObjectFit(mode: ObjectFit, scaleX: number, scaleY: number) {
        if (mode !== 'auto') return mode;
        return Math.max(scaleX, scaleY) > 1 ? 'cover' : 'contain';
    }
}
