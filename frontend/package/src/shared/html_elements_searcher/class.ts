import { EmptyStringIdError, HTMLElementNotFoundByIDError, UndefinedElementIdError } from './errors';

export default class HtmlElementsSearcher {
    static getElementById(elementId?: string) {
        HtmlElementsSearcher._validateElementId(elementId);
        return HtmlElementsSearcher._serchElementById(elementId!);
    }

    private static _validateElementId(elementId?: string) {
        if (HtmlElementsSearcher._isElementIdUndefined(elementId)) throw new UndefinedElementIdError();
        if (HtmlElementsSearcher._isElementIdEmptyString(elementId)) throw new EmptyStringIdError();
    }

    private static _isElementIdUndefined(elementId?: string) {
        return elementId === undefined || null;
    }

    private static _isElementIdEmptyString(elementId?: string) {
        return elementId === '';
    }

    private static _serchElementById(elementId: string) {
        const element = document.getElementById(elementId);
        if (!element) throw new HTMLElementNotFoundByIDError();
        return element;
    }
}
