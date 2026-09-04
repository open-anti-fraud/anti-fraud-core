import { VerificationMetrics } from '../../shared';
import { FaceDetectionTemplateExtractor, FaceFitterFaceDetection, Sample } from './types';

export const Endpoints = {
    FACE_DETECTOR: `face-detector/v2`,
    LIVENESS_ESTIMATOR: `liveness-estimator/v2`,
    DEEPFAKE_ESTIMATOR: `deepfake-estimator/v2`,
    VERIFY_MATCHER: `verify-matcher/v2`,
    FACE_DETECTION_TEMPLATE_EXTRACTOR: 'face-detector-template-extractor/v2',
    FACE_DETECTION_FITTER: `face-detector-face-fitter/v2`,
};

export class ImageAPI {
    static _baseUrl = '';
    static _token = '';

    static setToken(token: string) {
        ImageAPI._token = `Bearer ${token}`;
    }

    static setBaseUrl(baseUrl: string) {
        ImageAPI._baseUrl = baseUrl === '/' ? '' : baseUrl;
    }

    static faceDetectorFaceFitterApi(blob: Blob) {
        const formData = new FormData();
        formData.append('image', blob);

        return ImageAPI._sendRequest<Sample<FaceFitterFaceDetection>>(
            fetch(`${ImageAPI._baseUrl}${Endpoints.FACE_DETECTION_FITTER}/process/image`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: ImageAPI._token,
                },
            })
        );
    }

    static extractTemplate(obj: Sample<FaceFitterFaceDetection>) {
        return ImageAPI._sendRequest<Sample<FaceDetectionTemplateExtractor>>(
            fetch(`${ImageAPI._baseUrl}${Endpoints.FACE_DETECTION_TEMPLATE_EXTRACTOR}/process/sample`, {
                method: 'POST',
                body: JSON.stringify(obj),
                headers: {
                    'content-type': 'application/json',
                    Authorization: ImageAPI._token,
                },
            })
        );
    }

    static match(obj: Sample<FaceDetectionTemplateExtractor>) {
        return ImageAPI._sendRequest<VerificationMetrics>(
            fetch(`${ImageAPI._baseUrl}${Endpoints.VERIFY_MATCHER}/process/sample`, {
                method: 'POST',
                body: JSON.stringify(obj),
                headers: {
                    'content-type': 'application/json',
                    Authorization: ImageAPI._token,
                },
            })
        );
    }

    static async _sendRequest<T>(request: Promise<Response>) {
        try {
            const response = await request;
            const data = await response.json();
            return data as T;
        } catch (err) {
            throw err;
        }
    }
}
