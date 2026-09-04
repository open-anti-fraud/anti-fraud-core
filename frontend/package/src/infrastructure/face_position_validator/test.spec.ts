import { expect, test } from '../../../utils';

import { BoundingBox, Resolution } from '../../shared';
import FacePositionValidator from './class';

const validator = new FacePositionValidator();

const HD: Resolution = {
    width: 1280,
    height: 720,
};

const PADDINGS = {
    horizontal: 10,
    vertical: 10,
};

const PIXEL_PADDING = {
    horizontal: (HD.width / 100) * PADDINGS.horizontal,
    vertical: (HD.height / 100) * PADDINGS.vertical,
};

const initialFace: BoundingBox = {
    width: 200,
    height: 300,
    xMin: 200,
    yMin: 300,
    xMax: 400,
    yMax: 600,
};

const allowableAccuracyError = {
    x: 20,
    y: 30,
};

test.each([
    {
        position: 'center',
        bbox: {
            width: 200,
            height: 300,
            xMin: 600,
            yMin: 300,
            xMax: 800,
            yMax: 600,
        },
    },
    {
        position: 'top left corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: PIXEL_PADDING.horizontal,
            yMin: PIXEL_PADDING.vertical,
            xMax: PIXEL_PADDING.horizontal + 200,
            yMax: PIXEL_PADDING.vertical + 300,
        },
    },
    {
        position: 'top right corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width - PIXEL_PADDING.horizontal - 200,
            yMin: PIXEL_PADDING.vertical,
            xMax: HD.width - PIXEL_PADDING.horizontal,
            yMax: PIXEL_PADDING.vertical,
        },
    },
    {
        position: 'bottom right corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width - PIXEL_PADDING.horizontal - 200,
            yMin: HD.height - PIXEL_PADDING.vertical - 300,
            xMax: HD.width - PIXEL_PADDING.horizontal,
            yMax: HD.height - PIXEL_PADDING.vertical,
        },
    },
    {
        position: 'bottom left corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: PIXEL_PADDING.horizontal,
            yMin: HD.height - PIXEL_PADDING.vertical - 300,
            xMax: PIXEL_PADDING.horizontal + 200,
            yMax: HD.height - PIXEL_PADDING.vertical,
        },
    },
])(`Face in $position of the screen`, ({ bbox }) => {
    expect(validator.isOffscreen(bbox, HD, PADDINGS)).toBeFalsy();
});

test.each([
    {
        position: 'top left corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: PIXEL_PADDING.horizontal - 100,
            yMin: PIXEL_PADDING.vertical - 150,
            xMax: PIXEL_PADDING.horizontal + 100,
            yMax: PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'top',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width / 2 - 100,
            yMin: PIXEL_PADDING.vertical - 150,
            xMax: HD.width / 2 + 100,
            yMax: PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'top right corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width - PIXEL_PADDING.horizontal - 100,
            yMin: PIXEL_PADDING.vertical - 150,
            xMax: HD.width - PIXEL_PADDING.horizontal + 100,
            yMax: PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'right',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width + PIXEL_PADDING.horizontal - 100,
            yMin: HD.height / 2 - 150,
            xMax: HD.width + PIXEL_PADDING.horizontal + 100,
            yMax: HD.height / 2 + 150,
        },
    },
    {
        position: 'bottom right corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width + PIXEL_PADDING.horizontal - 100,
            yMin: HD.height + PIXEL_PADDING.vertical - 150,
            xMax: HD.width + PIXEL_PADDING.horizontal + 100,
            yMax: HD.height + PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'bottom',
        bbox: {
            width: 200,
            height: 300,
            xMin: HD.width / 2 - 100,
            yMin: HD.height - PIXEL_PADDING.vertical - 150,
            xMax: HD.width / 2 + 100,
            yMax: HD.height - PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'bottom left corner',
        bbox: {
            width: 200,
            height: 300,
            xMin: PIXEL_PADDING.horizontal - 100,
            yMin: HD.height + PIXEL_PADDING.vertical - 150,
            xMax: PIXEL_PADDING.horizontal + 100,
            yMax: HD.height + PIXEL_PADDING.vertical + 150,
        },
    },
    {
        position: 'left',
        bbox: {
            width: 200,
            height: 300,
            xMin: PIXEL_PADDING.horizontal - 100,
            yMin: HD.height / 2 - 150,
            xMax: PIXEL_PADDING.horizontal + 100,
            yMax: HD.height / 2 + 150,
        },
    },
])(`Face outside $position of the screen`, ({ bbox }) => {
    expect(validator.isOffscreen(bbox, HD, PADDINGS)).toBeTruthy();
});

/**
 * Validates the consistency of bounding-box coordinates and dimensions.
 */
function validateBoundingBox(face: BoundingBox) {
    expect(face.xMax - face.xMin).toBe(face.width);
    expect(face.yMax - face.yMin).toBe(face.height);
}

test.each([

    {
        title: 'exact_match',
        face: {
            width: 200,
            height: 300,
            xMin: 200,
            yMin: 300,
            xMax: 400,
            yMax: 600,
        },
    },


    {
        title: 'translated_up_by_allowable_error',
        face: {
            width: 200,
            height: 300,
            xMin: 200,
            yMin: 270,
            xMax: 400,
            yMax: 570,
        },
    },
    {
        title: 'translated_down_by_allowable_error', // y: +30
        face: {
            width: 200,
            height: 300,
            xMin: 200,
            yMin: 330,
            xMax: 400,
            yMax: 630,
        },
    },
    {
        title: 'translated_left_by_allowable_error',
        face: {
            width: 200,
            height: 300,
            xMin: 180,
            yMin: 300,
            xMax: 380,
            yMax: 600,
        },
    },
    {
        title: 'translated_right_by_allowable_error', // x: +20
        face: {
            width: 200,
            height: 300,
            xMin: 220,
            yMin: 300,
            xMax: 420,
            yMax: 600,
        },
    },


    {
        title: 'translated_up_and_left',
        face: {
            width: 200,
            height: 300,
            xMin: 180,
            yMin: 270,
            xMax: 380,
            yMax: 570,
        },
    },
    {
        title: 'translated_down_and_right',
        face: {
            width: 200,
            height: 300,
            xMin: 220,
            yMin: 330,
            xMax: 420,
            yMax: 630,
        },
    },


    {
        title: 'scaled_up_20_percent',
        face: {
            width: 240,
            height: 360,
            xMin: 180,
            yMin: 270, // (270+630)/2 = 450
            xMax: 420,
            yMax: 630,
        },
    },
    {
        title: 'scaled_down_20_percent',
        face: {
            width: 160,
            height: 240,
            xMin: 220,
            yMin: 330, // (330+570)/2 = 450
            xMax: 380,
            yMax: 570,
        },
    },


    {
        title: 'edge_case_max_x_shift',
        face: {
            width: 200,
            height: 300,
            xMin: 220,
            yMin: 300,
            xMax: 420,
            yMax: 600,
        },
    },
    {
        title: 'edge_case_max_y_shift',
        face: {
            width: 200,
            height: 300,
            xMin: 200,
            yMin: 270,
            xMax: 400,
            yMax: 570,
        },
    },
])('Face position: $title', ({ face }) => {
    validateBoundingBox(face);
    expect(validator.isSamePosition(face, initialFace, allowableAccuracyError)).toBeTruthy();
});
