import { FaceBestshotSettings } from '../types';
import {
    DEFAULLT_ALLOWABLE_ACCURACY_ERROR,
    DEFAULLT_FACE_WIDTH_COEFFICIENTS,
    DEFAULT_FACE_BORDDER_AUTO_DETECTED,
} from './face_border';

export const DEFAULT_FACE_BESTSHOT_SETTINGS: FaceBestshotSettings = {
    faceBorder: {
        autodetected: DEFAULT_FACE_BORDDER_AUTO_DETECTED,
        allowableAccuracyError: DEFAULLT_ALLOWABLE_ACCURACY_ERROR,
        faceWidthCoefficients: DEFAULLT_FACE_WIDTH_COEFFICIENTS,
    },
};
