/* eslint-disable @typescript-eslint/require-await */
import { getInfoOrEmptyDataAfterTimeout } from '../helpers';
import { BASE_FONT, FONT_SIZE, TEST_STRING } from './const';
import { fonts } from './fonts.json';

const BODY_ELEM = document.body;
const fontOffsetSizes: {
	[x: string]: {
		width: number;
		height: number;
	};
} = {};

function createSpanElement() {
	return document.createElement('span');
}

function setFontSettings(elem: HTMLSpanElement, family: string, size: string) {
	elem.style.fontSize = size;
	elem.style.fontFamily = family;
}

function initializeDefaultSpan() {
	const spanElement = createSpanElement();

	setFontSettings(spanElement, BASE_FONT, FONT_SIZE);
	spanElement.style.fontFamily = BASE_FONT;

	BODY_ELEM.appendChild(spanElement);

	fontOffsetSizes[BASE_FONT] = {
		width: spanElement.offsetWidth,
		height: spanElement.offsetHeight,
	};

	BODY_ELEM.removeChild(spanElement);
}

export default async function getAvailableFontsInfo(timeout: number) {
	return getInfoOrEmptyDataAfterTimeout<object | undefined>(
		timeout,
		() => {
			initializeDefaultSpan();

			const detectedFonts: boolean[] = new Array<boolean>(
				fonts.length
			).fill(false);

			const fontEls = fonts.map(async (font) => {
				const span = createSpanElement();
				setFontSettings(span, `"${font}",${BASE_FONT}`, FONT_SIZE);
				span.textContent = TEST_STRING;
				return span;
			});

			const fragment = new DocumentFragment();

			return Promise.all(fontEls)
				.then((res) => {
					res.forEach((el) => fragment.appendChild(el));

					const fragmentContainer = document.createElement('div');
					fragmentContainer.append(fragment);
					BODY_ELEM.appendChild(fragmentContainer);

					Array.from(fragmentContainer.children).forEach(
						(spanElem, index) => {
							const match =
								(spanElem as HTMLSpanElement).offsetWidth !==
									fontOffsetSizes[BASE_FONT].width ||
								(spanElem as HTMLSpanElement).offsetHeight !==
									fontOffsetSizes[BASE_FONT].height;

							detectedFonts[index] = match;
						}
					);

					fragmentContainer.remove();
				})
				.then(() => ({
					availableFontsInfo: detectedFonts,
				}));
		},
		undefined
	);
}
