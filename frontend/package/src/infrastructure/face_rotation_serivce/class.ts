import { AngleCalculationSettings, FaceRotation, Point3D } from '../../shared';

export default class FaceRotationService {
    defineRotationAnglesBy3dKeypoints(
        setting: AngleCalculationSettings,
        keypoints: Point3D[],
        verticalNormalizationAngle: number = 0
    ): FaceRotation {
        const currentRotation: FaceRotation = {
            currentHorizontalRotation: undefined,
            currentVerticalRotation: undefined,
            angles: {
                pitch: undefined,
                yaw: undefined,
                roll: undefined,
            },
        };

        if (keypoints.length === 0) return currentRotation;

        currentRotation.angles = this.caclulateAngles(keypoints, verticalNormalizationAngle);

        const leftAngle = setting.angles.left;
        const rightAngle = setting.angles.right;
        const upAngle = setting.angles.up;

        if (currentRotation.angles.pitch !== undefined) {
            if (currentRotation.angles.pitch >= upAngle) {
                currentRotation.currentVerticalRotation = 'up';
            } else if (currentRotation.angles.pitch < -upAngle) {
                currentRotation.currentVerticalRotation = 'down';
            } else {
                currentRotation.currentVerticalRotation = 'center';
            }
        }

        if (currentRotation.angles.yaw !== undefined) {
            if (currentRotation.angles.yaw >= leftAngle) {
                currentRotation.currentHorizontalRotation = 'left';
            } else if (currentRotation.angles.yaw <= -rightAngle) {
                currentRotation.currentHorizontalRotation = 'right';
            } else {
                currentRotation.currentHorizontalRotation = 'center';
            }
        }

        return currentRotation;
    }

    caclulateAngles(keypoints: { x: number; y: number; z: number }[], verticalNormalizationAngle = 0) {

        const forehead = keypoints[10];
        const rightCheek = keypoints[234];
        const leftCheek = keypoints[454];


        const vA = {
            x: rightCheek.x - forehead.x,
            y: rightCheek.y - forehead.y,
            z: rightCheek.z - forehead.z,
        };

        const vB = {
            x: leftCheek.x - forehead.x,
            y: leftCheek.y - forehead.y,
            z: leftCheek.z - forehead.z,
        };


        const normal = {
            x: -(vB.y * vA.z - vB.z * vA.y),
            y: vB.z * vA.x - vB.x * vA.z,
            z: vB.x * vA.y - vB.y * vA.x,
        };


        const length = Math.hypot(normal.x, normal.y, normal.z);
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;


        const yaw = Math.atan2(normal.x, normal.z);


        const pitch = Math.atan2(normal.y, Math.hypot(normal.x, normal.z));


        const rightEye = keypoints[468];
        const leftEye = keypoints[473];
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        return {
            yaw: (yaw * 180) / Math.PI,
            pitch: (pitch * 180) / Math.PI + verticalNormalizationAngle,
            roll: (roll * 180) / Math.PI,
        };
    }
}
