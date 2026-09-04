import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { FormField, FormFieldProps } from '../form_field';
import IdentifyApplicantForm from './class';

beforeEach(() => {
    vi.mock('../../../../services/localization', () => ({
        getLocalizationService: vi.fn(() => ({
            getLocalizedMessageByKey: vi.fn((key: string) => key.split('.').at(-1)),
        })),
    }));
});

afterEach(() => {
    vi.clearAllMocks();
});

let form: IdentifyApplicantForm;

const fieldsData: FormFieldProps[] = [
    { id: 'firstName', labelText: 'FirstName', type: 'text', value: '' },
    { id: 'lastName', labelText: 'LastName', type: 'text', value: '' },
    { id: 'email', labelText: 'Email', type: 'email', value: '' },
];

beforeEach(() => {
    form = new IdentifyApplicantForm(fieldsData);
});

afterEach(() => {
    form.destroy();
    form = undefined!;
});

test('Form root element exists', () => {
    expect(form.root).instanceOf(HTMLFormElement);
    expect(form.root.id).toBe('tdvc-identify-applicant-form');
    expect(form.root.classList).toContain('tdvc-identify-applicant-form');
});

test('Form fields are created and appended', () => {
    const fields = form.fields;
    expect(fields.length).toBe(fieldsData.length);
    fields.forEach((field, index) => {
        expect(field).instanceOf(FormField);
        expect(form.root).toContain(field.root);
        expect(field.input.value).toBe(fieldsData[index].value);
        expect(field.label.textContent).toBe(fieldsData[index].labelText);
    });
});

test('Readonly access to fields', () => {
    const fields = form.fields;
    const originalLength = fields.length;

    (fields as FormField[]).push(new FormField({ id: 'test', labelText: 'Test', type: 'text', value: '' }));

    expect(form.fields.length).toBe(originalLength);
});

test('Destroy removes all fields and form from DOM', () => {
    const container = document.createElement('div');
    container.appendChild(form.root);

    form.destroy();

    expect(form.fields.length).toBe(0);
    expect(container).not.toContain(form.root);
});

test('Each field can handle input events', async () => {
    const firstField = form.fields[0];
    const spy = vi.fn();
    firstField.onInput(spy);

    document.body.append(form.root);
    const input = screen.getByLabelText('FirstName') as HTMLInputElement;

    await userEvent.type(input, 'John');

    expect(spy).toHaveBeenCalled();
});

test('Each field can handle blur events', async () => {
    const lastField = form.fields[1];
    const spy = vi.fn();
    lastField.onBlur(spy);

    document.body.append(form.root);
    const input = screen.getByLabelText('LastName') as HTMLInputElement;

    await userEvent.click(input);
    await userEvent.tab();

    expect(spy).toHaveBeenCalledOnce();
});
