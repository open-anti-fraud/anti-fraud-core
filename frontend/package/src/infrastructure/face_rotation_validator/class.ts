import { FaceRotation } from '../../shared';

export default class FaceRotationValidator {
    public isHorizontalRotationCenter(rotation: FaceRotation) {
        return rotation.currentHorizontalRotation === 'center';
    }

    public isVerticalRotationCenter(rotation: FaceRotation) {
        return rotation.currentVerticalRotation === 'center';
    }
}
