import { MotionControlPattern } from '../../shared';

export type MotionControlPatternValidator = () => { score: number; isValid: boolean };

export type onMotionCalback = (
    patter: MotionControlPattern | 'return',
    currentAttemptNumber: number,
    result?: boolean
) => void;
