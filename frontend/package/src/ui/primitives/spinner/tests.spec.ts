import { expect, test } from '../../../../utils';
import Spinner from './class';

test('Spinner has root element', () => {
    const spinner = new Spinner();
    expect(spinner).instanceOf(Spinner);

    expect(spinner.root).toBeInstanceOf(SVGElement);
    expect(spinner.root.classList).toContain('tdvc-spinner');
});

test('Spinner has cirlce element', () => {
    const spinner = new Spinner();
    expect(spinner.circle).toBeInstanceOf(SVGElement);
    expect(spinner.circle.classList).toContain('tdvc-spinner__circle');
    expect(spinner.root).toContain(spinner.circle);
});

test('Spinner has root element', () => {
    const spinner = new Spinner();
    expect(spinner).instanceOf(Spinner);

    expect(spinner.root).toBeInstanceOf(SVGElement);
    expect(spinner.root.classList).toContain('tdvc-spinner');
});

test('After spinner destroy, spinner not exist in container', () => {
    const htmlContainer = document.createElement('div');
    const spinner = new Spinner();

    htmlContainer.append(spinner.root);
    expect(htmlContainer).toContain(spinner.root);

    spinner.destroy();
    expect(htmlContainer).not.toContain(spinner.root);
});
