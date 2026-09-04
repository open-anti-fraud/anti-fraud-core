import { expect, test } from '../../../../utils';
import PageLayout from './class';

test('Page has root element', () => {
    const page = new PageLayout();
    expect(page).instanceOf(PageLayout);

    expect(page.root).toBeInstanceOf(HTMLDivElement);
    expect(page.root.id).toBe('tdvc-base-content');
    expect(page.root.classList).toContain('tdvc-base-content');
});

test('Page has header element inside root', () => {
    const page = new PageLayout();

    expect(page.header).toBeInstanceOf(HTMLElement);
    expect(page.header.classList).toContain('tdvc-base-content__header');
    expect(page.root).toContain(page.header);
});

test('Page has content element inside root', () => {
    const page = new PageLayout();

    expect(page.content).toBeInstanceOf(HTMLElement);
    expect(page.content.id).toBe('tdvc-base-content__body');
    expect(page.content.classList).toContain('tdvc-base-content__body');
    expect(page.root).toContain(page.content);
});

test('Page has footer element inside root', () => {
    const page = new PageLayout();

    expect(page.footer).toBeInstanceOf(HTMLElement);
    expect(page.footer.classList).toContain('tdvc-base-content__footer');
    expect(page.root).toContain(page.footer);
});

test('After page destroy, page not exist in container', () => {
    const htmlContainer = document.createElement('div');

    const page = new PageLayout();
    htmlContainer.append(page.root);

    expect(page.root).toContain(page.header);
    expect(page.root).toContain(page.content);
    expect(page.root).toContain(page.footer);
    expect(htmlContainer).toContain(page.root);

    page.destroy();

    expect(page.root).not.toContain(page.header);
    expect(page.root).not.toContain(page.content);
    expect(page.root).not.toContain(page.footer);
    expect(htmlContainer).not.toContain(page.root);
});
