import { FaceDetectionResult, FaceRotation, RawVideoFrame } from '../shared';

export type FaceBestshot = RawVideoFrame & FaceDetectionResult & FaceRotation;
