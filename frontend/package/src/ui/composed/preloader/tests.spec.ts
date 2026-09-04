import { expect, test } from '../../../../utils';
import { Spinner } from '../../primitives';
import Preloader from './class';

test('Preloader has root element', () => {
    const preloader = new Preloader();
    expect(preloader).instanceOf(Preloader);

    expect(preloader.root).toBeInstanceOf(HTMLDivElement);
    expect(preloader.root.classList).toContain('tdvc-preloader');
});

test('Preloader has spinner element', () => {
    const preloader = new Preloader();
    expect(preloader.spinner).toBeInstanceOf(Spinner);
    expect(preloader.root).toContain(preloader.spinner.root);
});

test('Preloader has message element', () => {
    const preloader = new Preloader();
    expect(preloader.message).toBeInstanceOf(HTMLParagraphElement);
    expect(preloader.message.classList).toContain('tdvc-preloader__text');
    expect(preloader.message.textContent).toBe('');
    expect(preloader.root).toContain(preloader.message);
});

test('Update preloader message', () => {
    const preloader = new Preloader();
    expect(preloader.message.textContent).toBe('');

    const message =
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere sit, omnis alias delectus odio et repellat commodi sed totam quam nobis, culpa pariatur quia nam qui reiciendis optio nostrum maxime!';

    preloader.setMessage(message);
    expect(preloader.message.textContent).toBe(message);

    preloader.setMessage(undefined);
    expect(preloader.message.textContent).toBe('');
});

test('After preloader destroy, preloader not exist in container', () => {
    const htmlContainer = document.createElement('div');

    const preloader = new Preloader();
    htmlContainer.append(preloader.root);

    expect(preloader.root).toContain(preloader.spinner.root);
    expect(preloader.root).toContain(preloader.message);
    expect(htmlContainer).toContain(preloader.root);

    preloader.destroy();

    expect(preloader.root).not.toContain(preloader.spinner.root);
    expect(preloader.root).not.toContain(preloader.message);
    expect(htmlContainer).not.toContain(preloader.root);
});
