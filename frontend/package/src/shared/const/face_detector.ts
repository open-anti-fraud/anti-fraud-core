import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { FaceDetectorSettings } from '../types';

export const DEFAULT_NETWORK_PATH = '/networks/';
export enum FaceDetectorDelegateMode {
    CPU = 'CPU',
    GPU = 'GPU',
    AUTO = 'AUTO',
}

export const DEFAULT_FACE_DETECTOR_SETTINGS: FaceDetectorSettings = {
    modelEnabled: true,
    timeToStartRecord: 10000,
    angleCalculation: {
        angles: {
            left: 15,
            right: 15,
            up: 25,
        },
    },
    detectorOptions: {
        delegate: FaceDetectorDelegateMode.AUTO,
        minFaceDetectionConfidence: 0.3,
    },
    heathcheckImagePath: '/images/face_detector/face.jpg',
};

export const tdvcFaceDetector: {
    status: 'loading' | 'ready' | 'error' | undefined;
    errorMessage?: string;
    detector?: FaceLandmarker;
} = {
    status: undefined,
    errorMessage: undefined,
    detector: undefined,
};
