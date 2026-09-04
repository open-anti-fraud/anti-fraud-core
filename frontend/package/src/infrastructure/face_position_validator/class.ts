import { BoundingBox, Resolution } from '../../shared';

export type PositionAllowableAccuracyError = {
    x: number;
    y: number;
};

export const DEFAULT_POSITION_ALLOWABLE_ACCURACY_ERROR: PositionAllowableAccuracyError = {
    x: 20,
    y: 30,
};

export default class FacePositionValidator {
    public isOffscreen(
        bbox: BoundingBox,
        resolution: Resolution,
        paddings: {
            horizontal: number;
            vertical: number;
        }
    ) {
        const horizontalPadding = (resolution.width / 100) * paddings.horizontal;
        const verticalPadding = (resolution.height / 100) * paddings.vertical;

        return (
            bbox.xMin < horizontalPadding ||
            bbox.yMin < verticalPadding ||
            bbox.xMax > resolution.width - horizontalPadding ||
            bbox.yMax > resolution.height - verticalPadding
        );
    }

    public isSamePosition(
        bbox: BoundingBox,
        initialFaceBbox: BoundingBox,
        allowableAccuracyError = DEFAULT_POSITION_ALLOWABLE_ACCURACY_ERROR
    ) {
        return (
            bbox.xMin >= initialFaceBbox.xMin - allowableAccuracyError.x &&
            bbox.xMax <= initialFaceBbox.xMax + allowableAccuracyError.x &&
            bbox.yMin >= initialFaceBbox.yMin - allowableAccuracyError.y &&
            bbox.yMax <= initialFaceBbox.yMax + allowableAccuracyError.y
        );
    }
}
