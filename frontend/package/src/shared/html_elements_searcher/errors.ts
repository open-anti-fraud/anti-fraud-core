import { WebComponentError } from '../web_component_error';

export class UndefinedElementIdError extends WebComponentError {
    static readonly ERROR_NAME = 'UndefinedElementIdError';

    constructor(message?: string) {
        super({
            message: message ?? 'The identifier of the element not specified',
        });
    }
}

export class EmptyStringIdError extends WebComponentError {
    static readonly ERROR_NAME = 'EmptyStringIdError';

    constructor() {
        super({ message: 'The identifier of the element cannot be an empty string' });
    }
}

export class HTMLElementNotFoundByIDError extends WebComponentError {
    static readonly ERROR_NAME = 'HTMLElementNotFoundByIDError';

    constructor() {
        super({ message: 'Element not found in HTML document by specified identifier' });
    }
}
