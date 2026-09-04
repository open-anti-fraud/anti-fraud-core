import { useCallback, useEffect, useRef } from 'react';
import type { BiometryResult } from '../../domains';
import { useOpenAntiFraudComponent } from '../../hooks';

import './style.css';

export default function OpenAntiFraudWebComponent({
	blob,
	onClose,
	onError,
	onBestshot,
	onValidate,
}: {
	blob: string | undefined;
	onClose: () => void;
	onError: (error: Error) => void;
	onBestshot: (bestshot: string) => void;
	onValidate: (data: BiometryResult) => void;
}) {
	const { openAntiFraudComponent, init: runOpenAntiFraudComponent, destroy } = useOpenAntiFraudComponent();
	const isInited = useRef<Boolean>(null);

	const startBiometryCheck = useCallback(async () => {
		try {
			isInited.current = true;
			runOpenAntiFraudComponent({
				baseUrl: '/',
				mountElement: 'component-app',
				applicantPhoto: blob,
				callbacks: {
					onGetReferenceImages: onBestshot,
					onValidate: (data: unknown) => {
						console.log(data);
						onValidate(data as BiometryResult);
						onClose();
						destroy();
					},
					onError: (message: string) => {
						onClose();
						destroy();
						onError(new Error(message));
					},
				},
				authenticationToken: "token",
				externalLink: '1234',
			});
		} catch (err) {
			destroy();
			console.log(err);
			onError(err as Error);
			isInited.current = false;
		}
	}, [runOpenAntiFraudComponent, blob, onBestshot, onValidate, onClose, destroy, onError]);

	useEffect(() => {
		if (isInited.current === null) {
			startBiometryCheck();
		}
	}, [openAntiFraudComponent, destroy, startBiometryCheck]);

	return (
		<div className='modal-overflow center-block'>
			<div id='component-app'></div>
		</div>
	);
}
