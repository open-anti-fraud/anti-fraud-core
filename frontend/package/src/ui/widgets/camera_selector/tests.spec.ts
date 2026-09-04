import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CameraSelector from './class';

let selector: CameraSelector;

beforeEach(() => {
    selector = new CameraSelector();
    document.body.append(selector.root);
});

afterEach(() => {
    selector.destroy();
    selector = undefined!;
    document.body.innerHTML = '';
});

describe('CameraSelector basic', () => {
    test('should create a select element', () => {
        expect(selector.root).toBeInstanceOf(HTMLSelectElement);
        expect(selector.root.classList.contains('tdvc-camera-selector')).toBe(true);
        expect(selector.options.length).toBe(0);
    });

    test('addOption adds new option', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        expect(selector.options.length).toBe(1);
        expect(selector.options[0].value).toBe('1');
        expect(selector.options[0].textContent).toBe('Camera 1');
        expect(selector.root.contains(selector.options[0])).toBe(true);
    });

    test('addOption prevents duplicates', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        selector.addOption({ label: 'Camera 1 Duplicate', value: '1' });
        expect(selector.options.length).toBe(1);
    });

    test('addOption with isSelected sets selection', () => {
        selector.addOption({ label: 'Camera 1', value: '1', isSelected: true });
        selector.addOption({ label: 'Camera 2', value: '2', isSelected: true });
        expect(selector.options[0].selected).toBe(false);
        expect(selector.options[1].selected).toBe(true);
        expect(selector.value).toBe('2');
    });

    test('removeOption removes option by value', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        selector.addOption({ label: 'Camera 2', value: '2' });
        selector.removeOption('1');
        expect(selector.options.length).toBe(1);
        expect(selector.options[0].value).toBe('2');
        expect(selector.root.querySelector('[value="1"]')).toBeNull();
    });

    test('removeOption with non-existing value does nothing', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        selector.removeOption('non-existing');
        expect(selector.options.length).toBe(1);
    });

    test('removeAllOptions clears all options', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        selector.addOption({ label: 'Camera 2', value: '2' });
        selector.removeAllOptions();
        expect(selector.options.length).toBe(0);
        expect(selector.root.querySelectorAll('option').length).toBe(0);
    });

    test('onChange triggers callback', async () => {
        const spy = vi.fn();
        selector.addOption({ label: 'Camera 1', value: '1', isSelected: true });
        selector.addOption({ label: 'Camera 2', value: '2' });
        selector.onChange(spy);

        await userEvent.selectOptions(selector.root, '2');
        expect(spy).toHaveBeenCalledOnce();
    });

    test('destroy removes all options and element', () => {
        selector.addOption({ label: 'Camera 1', value: '1' });
        selector.destroy();
        expect(document.body.contains(selector.root)).toBe(false);
        expect(selector.options.length).toBe(0);
    });
});
