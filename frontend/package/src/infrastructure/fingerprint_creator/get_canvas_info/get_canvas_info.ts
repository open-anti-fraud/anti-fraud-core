import { getInfoOrEmptyDataAfterTimeout } from '../helpers';

export default function getCanvasInfo(timeout: number) {
	return getInfoOrEmptyDataAfterTimeout<string | undefined>(
		timeout,
		() => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (ctx) {
				ctx.canvas.width = 500;
				ctx.fillStyle = 'rgb(255,0,255)';

				ctx.beginPath();
				ctx.rect(20, 20, 150, 100);
				ctx.fill();
				ctx.stroke();
				ctx.closePath();

				ctx.beginPath();
				ctx.fillStyle = 'rgb(0,255,255)';
				ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
				ctx.fill();
				ctx.stroke();
				ctx.closePath();

				const txt =
					'i9as..$#po((^@KbXrw!~cz#$%^@£éúöüà情報çõ能的Fr<🍏🍎🍐🍊🍋';
				ctx.textBaseline = 'top';
				ctx.font = "14px 'Arial'";
				ctx.textBaseline = 'alphabetic';
				ctx.fillStyle = 'rgb(255,5,5)';
				ctx.rotate(0.03);
				ctx.fillText(txt, 4, 17);
				ctx.fillStyle = '#069';
				ctx.fillText(txt, 2, 15);
				ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
				ctx.fillText(txt, 4, 17);
				ctx.shadowBlur = 8;
				ctx.shadowColor = 'red';
				ctx.fillRect(20, 12, 100, 5);

				// canvas blending
				ctx.globalCompositeOperation = 'multiply';
				ctx.fillStyle = 'rgb(255,0,255)';
				ctx.beginPath();
				ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
				ctx.closePath();

				ctx.fill();
				ctx.fillStyle = 'rgb(0,255,255)';
				ctx.beginPath();
				ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
				ctx.closePath();

				ctx.fill();
				ctx.fillStyle = 'rgb(255,255,0)';
				ctx.beginPath();
				ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
				ctx.closePath();

				ctx.fill();
				ctx.fillStyle = 'rgb(255,0,255)';

				// canvas winding
				ctx.arc(75, 75, 75, 0, Math.PI * 2, true);
				ctx.arc(75, 75, 25, 0, Math.PI * 2, true);
				ctx.fill('evenodd');
			}

			return canvas.toDataURL();
		},
		undefined
	);
}
