import {
    AbortAccessToCameraError,
    CameraSecurityError,
    DocumentIsNotFullyActiveError,
    NotAllowedAccessToCameraError,
    NotFoundCameraError,
    NotReadableCameraError,
    OverconstrainedCameraError,
} from '../../errors';
import { WebComponentError } from '../../web_component_error';

export enum CameraErrors {
    ABORT = 'AbortError',
    INVALID_STATE = 'InvalidStateError',
    NOT_ALLOWED = 'NotAllowedError',
    NOT_FOUND = 'NotFoundError',
    NOT_READABLE = 'NotReadableError',
    OVER_CONSTRAINED = 'OverconstrainedError',
    SECURITY = 'SecurityError',
}

export default function handleMediaDeviceError(error: Error) {
    if (!(error instanceof Error)) return error;
    if (error instanceof WebComponentError) return error;

    const { name, message } = error;

    switch (name) {
        case CameraErrors.ABORT:
            return new AbortAccessToCameraError();
        case CameraErrors.INVALID_STATE:
            return new DocumentIsNotFullyActiveError();
        case CameraErrors.NOT_ALLOWED:
        case 'NotAllowedAccessToCameraError':
            return new NotAllowedAccessToCameraError();
        case CameraErrors.NOT_FOUND:
            return new NotFoundCameraError();
        case CameraErrors.NOT_READABLE:
            return new NotReadableCameraError();
        case CameraErrors.OVER_CONSTRAINED:
            return new OverconstrainedCameraError();
        case CameraErrors.SECURITY:
            return new CameraSecurityError();
        default:
            return new WebComponentError({ message });
    }
}
