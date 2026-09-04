import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ErrorScreenLayout from './class';


vi.mock('../../primitives', () => ({
    Button: vi.fn().mockImplementation(() => ({
        root: document.createElement('button'),
        destroy: vi.fn(),
    })),
}));

describe('ErrorScreenLayout', () => {
    let layout: ErrorScreenLayout;

    beforeEach(() => {
        layout = new ErrorScreenLayout();
    });

    afterEach(() => {
        layout.destroy();
        vi.clearAllMocks();
    });

    test('Root element is created with correct id and class', () => {
        expect(layout.root).toBeInstanceOf(HTMLDivElement);
        expect(layout.root.id).toBe('tdvc-error');
        expect(layout.root.classList.contains('tdvc-error')).toBe(true);
    });

    test('Error message element is created with correct class', () => {
        expect(layout.errorMessage).toBeInstanceOf(HTMLParagraphElement);
        expect(layout.errorMessage.classList.contains('tdvc-error__error-message')).toBe(true);
        expect(layout.root).toContain(layout.errorMessage);
    });

    test('setErrorMessage sets correct text content', () => {
        layout.setErrorMessage('Something went wrong');
        expect(layout.errorMessage.textContent).toBe('Something went wrong');
    });

    test('setErrorMessage clears text when called without args', () => {
        layout.setErrorMessage('Some error');
        layout.setErrorMessage();
        expect(layout.errorMessage.textContent).toBe('');
    });

    test('destroy removes all elements from DOM and calls button.destroy()', () => {
        document.body.append(layout.root);
        layout.destroy();
        expect(document.body.contains(layout.root)).toBe(false);
        expect(layout.errorMessage.isConnected).toBe(false);
    });
});
