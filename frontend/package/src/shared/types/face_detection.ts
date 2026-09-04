import { Point3D } from './geometry';

export type FaceDetectionResult = {
    bbox: BoundingBox | undefined;
    keypoints: Point3D[] | undefined;
    normalizedKeypoints: Point3D[] | undefined;
};

export type BoundingBox = {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
};

export type FaceRotation = {
    currentHorizontalRotation: undefined | 'left' | 'right' | 'center';
    currentVerticalRotation: undefined | 'up' | 'down' | 'center';
    angles: {
        pitch: undefined | number;
        yaw: undefined | number;
        roll: undefined | number;
    };
};

export type FacePosition = {
    bbox: BoundingBox;
    rotation: FaceRotation;
};
