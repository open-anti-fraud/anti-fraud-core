import { BoundingBox, Resolution } from '../../shared';

export type SizeAllowableAccuracyError = {
    x: number;
    y: number;
};

export const DEFAULT_SIZE_ALLOWABLE_ACCURACY_ERROR: SizeAllowableAccuracyError = { x: 0, y: 0 };

export default class FaceSizeValidator {
    public isTooSmall(
        bbox: BoundingBox,
        minResolution: Resolution,
        allowableAccuracyError = DEFAULT_SIZE_ALLOWABLE_ACCURACY_ERROR
    ) {
        return (
            bbox.width < minResolution.width - allowableAccuracyError.x ||
            bbox.height < minResolution.height - allowableAccuracyError.y
        );
    }

    public isTooBig(
        bbox: BoundingBox,
        maxResolution: Resolution,
        allowableAccuracyError = DEFAULT_SIZE_ALLOWABLE_ACCURACY_ERROR
    ) {
        return (
            bbox.width > maxResolution.width + allowableAccuracyError.x ||
            bbox.height > maxResolution.height + allowableAccuracyError.y
        );
    }
}
