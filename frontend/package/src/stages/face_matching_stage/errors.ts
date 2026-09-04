import { WebComponentError } from '../../shared';

export class InvalidOriginBlobError extends WebComponentError {
    static readonly ERROR_NAME = 'InvalidOriginBlobError';
    public readonly code = '1170095';

    constructor(message?: string) {
        super({
            message: message ?? 'Cannot parse origin photo',
        });
    }
}

export class NoFaceOnOriginalPhotoError extends WebComponentError {
    static readonly ERROR_NAME = 'NoFaceOnOriginalPhotoError';
    public readonly code = '1170096';

    constructor(message?: string) {
        super({
            message: message ?? 'The original photo does not contain a face',
        });
    }
}

export class TooManyFacesOnOriginalPhotoError extends WebComponentError {
    static readonly ERROR_NAME = 'TooManyFacesOnOriginalPhotoError';
    public readonly code = '1170097';

    constructor(message?: string) {
        super({
            message: message ?? 'The original photo contains a more than one face',
        });
    }
}

export class NoFaceOnBestshotError extends WebComponentError {
    static readonly ERROR_NAME = 'NoFaceOnBestshotError';
    public readonly code = '1170098';

    constructor(message?: string) {
        super({
            message: message ?? 'The bestshot does not contain a face',
        });
    }
}

export class TooManyFacesOnBestshotsError extends WebComponentError {
    static readonly ERROR_NAME = 'TooManyFacesOnBestshotsError';
    public readonly code = '1170099';

    constructor(message?: string) {
        super({
            message: message ?? 'The bestshot contains a more than one face',
        });
    }
}
