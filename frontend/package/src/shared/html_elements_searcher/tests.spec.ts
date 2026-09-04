import { afterEach, beforeEach, expect, test } from '../../../utils';
import HtmlElementsSearcher from './class';
import { EmptyStringIdError, HTMLElementNotFoundByIDError, UndefinedElementIdError } from './errors';

beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
    document.body.innerHTML = '';
});

test('Get html element in DOM by valid id', () => {
    const element = HtmlElementsSearcher.getElementById('app');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(HTMLDivElement);
});

test('Throw error if try get element by empty string', () => {
    expect(() => HtmlElementsSearcher.getElementById('')).toThrowError(new EmptyStringIdError());
});

test('Throw error if try get element by undefined id', () => {
    expect(() => HtmlElementsSearcher.getElementById(undefined)).toThrowError(new UndefinedElementIdError());
});

test('Throw error if element not found', () => {
    expect(() => HtmlElementsSearcher.getElementById('app1')).toThrowError(new HTMLElementNotFoundByIDError());
});
