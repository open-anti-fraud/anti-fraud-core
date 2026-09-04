import { getInfoOrEmptyDataAfterTimeout } from '../helpers';

export default function getScreenInfo(timeout: number) {
	return getInfoOrEmptyDataAfterTimeout<object>(
		timeout,
		() => {
			const {
				width,
				height,
				availWidth,
				availHeight,
				colorDepth,
				pixelDepth,
				orientation,
			} = window.screen;
			const { innerWidth, innerHeight, outerWidth, outerHeight } = window;

			return {
				width,
				height,
				availWidth,
				availHeight,
				colorDepth,
				pixelDepth,
				orientationAngle: orientation ? orientation.angle : undefined,
				orientationType: orientation ? orientation.type : undefined,
				innerWidth,
				innerHeight,
				outerWidth,
				outerHeight,
			};
		},
		{
			width: undefined,
			height: undefined,
			availWidth: undefined,
			availHeight: undefined,
			colorDepth: undefined,
			pixelDepth: undefined,
			orientationAngle: undefined,
			orientationType: undefined,
			innerWidth: undefined,
			innerHeight: undefined,
			outerWidth: undefined,
			outerHeight: undefined,
		}
	);
}
