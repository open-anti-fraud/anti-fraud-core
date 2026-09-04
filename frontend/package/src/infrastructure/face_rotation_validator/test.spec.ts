import { expect, test } from '../../../utils';
import FaceRotationValidator from './class';

const validator = new FaceRotationValidator();

test('Face is center for vertical rotation', () => {
    expect(
        validator.isVerticalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'center',
            currentVerticalRotation: 'center',
        })
    ).toBeTruthy();
});

test('Face is up for vertical rotation', () => {
    expect(
        validator.isVerticalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'center',
            currentVerticalRotation: 'up',
        })
    ).toBeFalsy();
});

test('Face is down for vertical rotation', () => {
    expect(
        validator.isVerticalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'center',
            currentVerticalRotation: 'down',
        })
    ).toBeFalsy();
});

test('Face is center for horizontal rotation', () => {
    expect(
        validator.isHorizontalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'center',
            currentVerticalRotation: 'center',
        })
    ).toBeTruthy();
});

test('Face is left for horizontal rotation', () => {
    expect(
        validator.isHorizontalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'left',
            currentVerticalRotation: 'center',
        })
    ).toBeFalsy();
});

test('Face is right for horizontal rotation', () => {
    expect(
        validator.isHorizontalRotationCenter({
            angles: {
                pitch: 0,
                roll: 0,
                yaw: 0,
            },
            currentHorizontalRotation: 'right',
            currentVerticalRotation: 'center',
        })
    ).toBeFalsy();
});
