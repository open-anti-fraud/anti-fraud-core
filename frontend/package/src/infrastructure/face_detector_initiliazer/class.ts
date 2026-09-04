try {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string' && input.includes('odml.pa.googleapis.com/v1/log')) {
            console.warn('Blocked telemetry request:', input);

            return Promise.resolve(new Response(null, { status: 200, statusText: 'OK' }));
        }
        return originalFetch.call(this, input, init);
    };
} catch (err) {
    console.error(err);
}

import { FaceLandmarker, FaceLandmarkerOptions, FilesetResolver } from '@mediapipe/tasks-vision';
import { DetectorOptions, FaceDetectorDelegateMode, tdvcFaceDetector, timer, WebComponentError } from '../../shared';
import {
    InitializationFaceDetectionServiceError,
    NoTestFaceDetectorImageError,
    NotSupportedDelegationModeError,
    UnsupportFaceDetectorError,
} from './error';

export default class FaceDetectorInitiliazer {
    static filesetResolver: unknown;
    static detectorOptions: FaceLandmarkerOptions;
    private static _detectingModeState: 'unknow' | 'detecting' | 'detected' = 'unknow';

    public static async initDetector(
        modelPath: string = '/networks/',
        options?: DetectorOptions,
        healthcheckImagePath = '/images/face_detector/face.jpg'
    ) {
        if (FaceDetectorInitiliazer._detectingModeState === 'detected') return;
        while (FaceDetectorInitiliazer._detectingModeState === 'detecting') await timer(100);

        tdvcFaceDetector.errorMessage = undefined;
        FaceDetectorInitiliazer._detectingModeState = 'detecting';

        let isGpuSupported = false;

        try {
            await FaceDetectorInitiliazer._initDetector(modelPath, options, healthcheckImagePath);
            isGpuSupported = true;
        } catch (err) {
            await FaceDetectorInitiliazer.destroy();
            if (err instanceof WebComponentError && err.name !== NotSupportedDelegationModeError.ERROR_NAME) throw err;
        }

        if (!isGpuSupported) {
            if (options?.delegate !== FaceDetectorDelegateMode.AUTO) throw new NotSupportedDelegationModeError();

            try {
                await FaceDetectorInitiliazer._initDetector(
                    modelPath,
                    { ...options, delegate: FaceDetectorDelegateMode.CPU },
                    healthcheckImagePath
                );
            } catch (err) {
                await FaceDetectorInitiliazer.destroy();
                if (err instanceof WebComponentError && err.name !== NotSupportedDelegationModeError.ERROR_NAME)
                    throw err;
                throw new UnsupportFaceDetectorError();
            }
        }

        FaceDetectorInitiliazer._detectingModeState = 'detected';
    }

    private static async _initDetector(
        modelPath: string = '/networks/',
        options?: DetectorOptions,
        healthcheckImagePath = '/images/face_detector/face.jpg'
    ): Promise<void> {
        const { detector, status } = tdvcFaceDetector;
        const path = modelPath ?? '/networks/';

        if (detector && status === 'ready') return;

        while (status === 'loading') await timer(100);

        tdvcFaceDetector.status = 'loading';
        tdvcFaceDetector.errorMessage = undefined;
        tdvcFaceDetector.detector = undefined;

        try {
            FaceDetectorInitiliazer.filesetResolver = await FilesetResolver.forVisionTasks(path);
            await FaceDetectorInitiliazer.createDetector(path, options);
            await FaceDetectorInitiliazer.healthcheck(healthcheckImagePath);
            tdvcFaceDetector.status = 'ready';
        } catch (err) {
            console.error(err);

            tdvcFaceDetector.errorMessage = (err as Error).message;
            tdvcFaceDetector.status = 'error';
            tdvcFaceDetector.detector = undefined;

            if (err instanceof WebComponentError) throw err;
            throw new InitializationFaceDetectionServiceError();
        }
    }

    public static async createDetector(modelPath: string = '/networks/', options?: DetectorOptions) {
        if (!!tdvcFaceDetector.detector) return;

        const modelUrl = `${modelPath}/face_landmarker.task`;
        const delegate = FaceDetectorInitiliazer._defineDelegateMode(options);
        const minFaceDetectionConfidence = FaceDetectorInitiliazer._defineMinFaceDetectionConfidence(options);

        FaceDetectorInitiliazer.detectorOptions = {
            baseOptions: {
                delegate,
            },
            numFaces: 1,
            runningMode: 'VIDEO',
            minFaceDetectionConfidence,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        };

        tdvcFaceDetector.detector = await FaceLandmarker.createFromOptions(

            FaceDetectorInitiliazer.filesetResolver,
            {
                ...FaceDetectorInitiliazer.detectorOptions,
                baseOptions: {
                    ...FaceDetectorInitiliazer.detectorOptions.baseOptions,
                    modelAssetPath: modelUrl,
                },
            }
        );
        tdvcFaceDetector.errorMessage = undefined;
    }

    private static _defineDelegateMode(options?: DetectorOptions) {
        if (options?.delegate === FaceDetectorDelegateMode.GPU || options?.delegate === FaceDetectorDelegateMode.AUTO)
            return FaceDetectorDelegateMode.GPU;

        return FaceDetectorDelegateMode.CPU;
    }

    private static _defineMinFaceDetectionConfidence(options?: DetectorOptions) {
        let minFaceDetectionConfidence = options?.minFaceDetectionConfidence ?? 0.3;
        minFaceDetectionConfidence = Number(minFaceDetectionConfidence);
        minFaceDetectionConfidence = isNaN(minFaceDetectionConfidence) ? 0.3 : minFaceDetectionConfidence;

        if (minFaceDetectionConfidence < 0) {
            minFaceDetectionConfidence = 0.1;
        } else if (minFaceDetectionConfidence > 1) {
            minFaceDetectionConfidence = 0.95;
        }

        return minFaceDetectionConfidence;
    }

    public static async healthcheck(path: string) {
        let image;

        try {
            const response = await fetch(path);
            const blob = await response.blob();
            image = await createImageBitmap(blob);
        } catch (err) {
            throw new NoTestFaceDetectorImageError();
        }

        try {
            const data = tdvcFaceDetector.detector?.detectForVideo(image, performance.now());
            if (!data || !data.faceLandmarks || data.faceLandmarks.length < 1) throw new Error('No face detected');
        } catch (err) {
            throw new NotSupportedDelegationModeError();
        }
    }

    public static async destroy() {
        if (tdvcFaceDetector.detector) {
            tdvcFaceDetector.detector.close();
            tdvcFaceDetector.detector = undefined;
            tdvcFaceDetector.status = undefined;
            FaceDetectorInitiliazer._detectingModeState = 'unknow';
        }
    }
}
