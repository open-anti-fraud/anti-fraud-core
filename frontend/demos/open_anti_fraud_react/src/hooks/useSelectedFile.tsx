import { useCallback, useState } from 'react';

export default function useSelectFile() {
	const [file, setFile] = useState<File | undefined>(undefined);
	const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);
	const [src, setSrc] = useState<string | undefined>(undefined);

	const handleFile = useCallback(async (file: File) => {
		setFile(file);

		const dataUrl: string = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = function (event) {
				const content = event.target!.result as string;
				resolve(content);
			};
			reader.onerror = (event) => {
				reject(event);
			};
			reader.readAsDataURL(file);
		});
		setDataUrl(dataUrl);

		const source = URL.createObjectURL(file);
		setSrc(source);
	}, []);

	const resetFile = useCallback(() => {
		setFile(undefined);

		if (src) {
			URL.revokeObjectURL(src);
			setSrc(undefined);
		}
	}, [src]);

	return {
		file,
		src,
		dataUrl,
		handleFile,
		resetFile,
	};
}
