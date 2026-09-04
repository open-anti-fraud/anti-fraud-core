import { BoundingBox } from '../types';

export default function getScaledBbox(bbox: BoundingBox, scalingCoefficient = 1): BoundingBox {
    const scaledWidth = bbox.width * scalingCoefficient;
    const scaledHeight = (scaledWidth * 3) / 2;
    const center = {
        x: bbox.xMin + bbox.width / 2,
        y: bbox.yMin + bbox.height / 2,
    };

    return {
        width: scaledWidth,
        height: scaledHeight,
        xMin: center.x - scaledWidth / 2,
        yMin: center.y - scaledHeight / 2,
        xMax: center.x + scaledWidth / 2,
        yMax: center.y + scaledHeight / 2,
    };
}
