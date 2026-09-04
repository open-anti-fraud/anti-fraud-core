import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from '../../../../utils';
import FormField from './class';

beforeAll(() => {
    vi.mock('../../../../services/localization', () => ({
        getLocalizationService: vi.fn(() => ({
            getLocalizedMessageByKey: vi.fn((key: string) => key.split('.').at(-1)),
        })),
    }));
});

afterAll(() => {
    vi.clearAllMocks();
});

let field: FormField;
beforeEach(() => {
    field = new FormField({
        id: 'id',
        labelText: 'Label',
        type: 'text',
        value: '',
    });
});

afterEach(() => {
    field.destroy();
    field = undefined!;
});

test('Form field root is exist', () => {
    expect(field.root).instanceOf(HTMLDivElement);
    expect(field.root.classList).toContain('tdvc-form-field');
});

test('Form field has label', () => {
    expect(field.label).instanceOf(HTMLLabelElement);
    expect(field.label.classList).toContain('tdvc-form-field__label');
    expect(field.label.getAttribute('for')).toBe('id');
    expect(field.root).toContain(field.label);
});

test('Form field has input', () => {
    expect(field.input).instanceOf(HTMLInputElement);
    expect(field.input.id).toBe('id');
    expect(field.input.name).toBe('id');
    expect(field.input.classList).toContain('tdvc-form-field__input');
    expect(field.inputWrapper).toContain(field.input);
    expect(field.root).toContain(field.inputWrapper);
});

test('Form field has icon container', () => {
    expect(field.icon).instanceOf(HTMLDivElement);
    expect(field.icon.classList).toContain('tdvc-form-field__icon');
    expect(field.inputWrapper).toContain(field.icon);
    expect(field.root).toContain(field.inputWrapper);
});

test('Form field has errror message', () => {
    expect(field.errorMessage).instanceOf(HTMLParagraphElement);
    expect(field.errorMessage.classList).toContain('tdvc-form-field__error-message');
    expect(field.root).toContain(field.errorMessage);
});

test('onBlur event handle called', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    field.onBlur(() => console.log('Test'));

    document.body.append(field.root);
    const input = screen.getByLabelText('Label') as HTMLInputElement;

    await userEvent.click(input);
    await userEvent.tab();

    expect(spy).toHaveBeenCalledOnce();
});

test('onInput event handle called', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    field.onInput(() => console.log('Test'));

    document.body.append(field.root);
    const input = screen.getByLabelText('Label') as HTMLInputElement;

    await userEvent.type(input, 'text');
    await userEvent.clear(input);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.length).toBe(5);
});

test('setError shows error message and sets aria-invalid', () => {
    field.setError('IsRequired');
    expect(field.input.getAttribute('aria-invalid')).toBe('true');
    expect(field.errorMessage.textContent).toBe('IsRequired');
});

test('removeError clears error message and aria-invalid', () => {
    field.setError('IsRequired');
    field.removeError();
    expect(field.input.hasAttribute('aria-invalid')).toBe(false);
    expect(field.errorMessage.textContent).toBe('');
});

test('After form field destroy, field not exist in container', () => {
    const htmlContainer = document.createElement('div');
    htmlContainer.append(field.root);

    field.destroy();

    expect(field.root).not.toContain(field.label);
    expect(field.inputWrapper).not.toContain(field.input);
    expect(field.inputWrapper).not.toContain(field.icon);
    expect(field.root).not.toContain(field.inputWrapper);
    expect(field.root).not.toContain(field.errorMessage);
    expect(htmlContainer).not.toContain(field.root);
});
