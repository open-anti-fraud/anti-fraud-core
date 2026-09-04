import { describe, expect, test } from '../../../utils';
import { BoundingBox, Resolution } from '../../shared';
import FaceSizeValidator, { SizeAllowableAccuracyError } from './class';


const MIN_RESOLUTION: Resolution = { width: 200, height: 300 };
const MAX_RESOLUTION: Resolution = { width: 800, height: 600 };

const DEFAULT_ERROR: SizeAllowableAccuracyError = { x: 0, y: 0 };
const ALLOWABLE_ERROR: SizeAllowableAccuracyError = { x: 20, y: 40 };

const validator = new FaceSizeValidator();


function createBoundingBox(width: number, height: number): BoundingBox {
    return {
        width,
        height,
        xMin: 0,
        yMin: 0,
        xMax: width,
        yMax: height,
    };
}

function validateBoundingBox(bbox: BoundingBox) {
    expect(bbox.xMax - bbox.xMin).toBeCloseTo(bbox.width, 0);
    expect(bbox.yMax - bbox.yMin).toBeCloseTo(bbox.height, 0);
}

describe('FaceSizeValidator', () => {
    describe('isTooSmall', () => {
        test.each([
            {
                scenario: 'exactly at the minimum (no tolerance)',
                bbox: createBoundingBox(MIN_RESOLUTION.width, MIN_RESOLUTION.height),
                allowableError: DEFAULT_ERROR,
                expected: false,
            },
            {
                scenario: 'one pixel below the minimum (no tolerance)',
                bbox: createBoundingBox(MIN_RESOLUTION.width - 1, MIN_RESOLUTION.height - 1),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'at the minimum with tolerance applied',
                bbox: createBoundingBox(
                    MIN_RESOLUTION.width - ALLOWABLE_ERROR.x,
                    MIN_RESOLUTION.height - ALLOWABLE_ERROR.y
                ),
                allowableError: ALLOWABLE_ERROR,
                expected: false,
            },
            {
                scenario: 'one pixel below the tolerance-adjusted minimum',
                bbox: createBoundingBox(
                    MIN_RESOLUTION.width - ALLOWABLE_ERROR.x - 1,
                    MIN_RESOLUTION.height - ALLOWABLE_ERROR.y - 1
                ),
                allowableError: ALLOWABLE_ERROR,
                expected: true,
            },
            {
                scenario: 'width below minimum while height is valid',
                bbox: createBoundingBox(MIN_RESOLUTION.width - 10, MIN_RESOLUTION.height + 50),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'height below minimum while width is valid',
                bbox: createBoundingBox(MIN_RESOLUTION.width + 50, MIN_RESOLUTION.height - 10),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'well below minimum in both dimensions',
                bbox: createBoundingBox(100, 150),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
        ])('[$scenario] bbox($bbox.width×$bbox.height) → $expected', ({ bbox, allowableError, expected }) => {
            validateBoundingBox(bbox);
            const result = validator.isTooSmall(bbox, MIN_RESOLUTION, allowableError);
            expect(result).toBe(expected);
        });
    });

    describe('isTooBig', () => {
        test.each([
            {
                scenario: 'exactly at the maximum (no tolerance)',
                bbox: createBoundingBox(MAX_RESOLUTION.width, MAX_RESOLUTION.height),
                allowableError: DEFAULT_ERROR,
                expected: false,
            },
            {
                scenario: 'one pixel above the maximum (no tolerance)',
                bbox: createBoundingBox(MAX_RESOLUTION.width + 1, MAX_RESOLUTION.height + 1),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'at the maximum with tolerance applied',
                bbox: createBoundingBox(
                    MAX_RESOLUTION.width + ALLOWABLE_ERROR.x,
                    MAX_RESOLUTION.height + ALLOWABLE_ERROR.y
                ),
                allowableError: ALLOWABLE_ERROR,
                expected: false,
            },
            {
                scenario: 'one pixel above the tolerance-adjusted maximum',
                bbox: createBoundingBox(
                    MAX_RESOLUTION.width + ALLOWABLE_ERROR.x + 1,
                    MAX_RESOLUTION.height + ALLOWABLE_ERROR.y + 1
                ),
                allowableError: ALLOWABLE_ERROR,
                expected: true,
            },
            {
                scenario: 'width above maximum while height is valid',
                bbox: createBoundingBox(MAX_RESOLUTION.width + 10, MAX_RESOLUTION.height - 50),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'height above maximum while width is valid',
                bbox: createBoundingBox(MAX_RESOLUTION.width - 50, MAX_RESOLUTION.height + 10),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
            {
                scenario: 'well above maximum in both dimensions',
                bbox: createBoundingBox(1000, 800),
                allowableError: DEFAULT_ERROR,
                expected: true,
            },
        ])('[$scenario] bbox($bbox.width×$bbox.height) → $expected', ({ bbox, allowableError, expected }) => {
            validateBoundingBox(bbox);
            const result = validator.isTooBig(bbox, MAX_RESOLUTION, allowableError);
            expect(result).toBe(expected);
        });
    });
});


test('isTooSmall with a zero minimum resolution', () => {
    const bbox = createBoundingBox(100, 150);
    const zeroMinResolution: Resolution = { width: 0, height: 0 };

    const result = validator.isTooSmall(bbox, zeroMinResolution);
    expect(result).toBe(false);
});

test('isTooBig with a zero maximum resolution', () => {
    const bbox = createBoundingBox(100, 150);
    const zeroMaxResolution: Resolution = { width: 0, height: 0 };

    const result = validator.isTooBig(bbox, zeroMaxResolution);
    expect(result).toBe(true);
});

test('isTooSmall with a negative minimum resolution', () => {
    const bbox = createBoundingBox(200, 300);
    const negativeMin: Resolution = { width: -100, height: -50 };

    const result = validator.isTooSmall(bbox, negativeMin);
    expect(result).toBe(false);
});

test('isTooBig with a negative maximum resolution', () => {
    const bbox = createBoundingBox(200, 300);
    const negativeMax: Resolution = { width: -100, height: -50 };

    const result = validator.isTooBig(bbox, negativeMax);
    expect(result).toBe(true);
});

test('handles a bounding box with negative dimensions', () => {
    const negativeBbox: BoundingBox = {
        width: -50,
        height: -30,
        xMin: 0,
        yMin: 0,
        xMax: -50,
        yMax: -30,
    };


    expect(validator.isTooSmall(negativeBbox, MIN_RESOLUTION)).toBe(true);
    expect(validator.isTooBig(negativeBbox, MAX_RESOLUTION)).toBe(false);
});

test('handles bounding boxes at the tolerance boundary', () => {

    const borderBbox1: BoundingBox = {
        width: MIN_RESOLUTION.width - ALLOWABLE_ERROR.x,
        height: MIN_RESOLUTION.height - ALLOWABLE_ERROR.y - 1,
        xMin: 0,
        yMin: 0,
        xMax: MIN_RESOLUTION.width - ALLOWABLE_ERROR.x,
        yMax: MIN_RESOLUTION.height - ALLOWABLE_ERROR.y - 1,
    };
    expect(validator.isTooSmall(borderBbox1, MIN_RESOLUTION, ALLOWABLE_ERROR)).toBe(true);


    const borderBbox2: BoundingBox = {
        width: MAX_RESOLUTION.width + ALLOWABLE_ERROR.x,
        height: MAX_RESOLUTION.height + ALLOWABLE_ERROR.y + 1,
        xMin: 0,
        yMin: 0,
        xMax: MAX_RESOLUTION.width + ALLOWABLE_ERROR.x,
        yMax: MAX_RESOLUTION.height + ALLOWABLE_ERROR.y + 1,
    };
    expect(validator.isTooBig(borderBbox2, MAX_RESOLUTION, ALLOWABLE_ERROR)).toBe(true);
});
