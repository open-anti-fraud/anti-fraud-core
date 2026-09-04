import tdvc, { type IWebComponent, type LiteComponentSettingsFromClient } from '@tdvc/face-onboarding';
import '@tdvc/face-onboarding/dist/css/style.css';
import { useCallback, useRef } from 'react';

export default function useOpenAntiFraudComponent() {
	const openAntiFraudComponent = useRef<IWebComponent>(null);

	const init = useCallback((config: LiteComponentSettingsFromClient) => {
		openAntiFraudComponent.current = new tdvc.Lite(config);
	}, []);

	const destroy = useCallback(() => {
		openAntiFraudComponent.current?.destroy();
		openAntiFraudComponent.current = null;
	}, []);

	return {
		openAntiFraudComponent,
		init,
		destroy,
	};
}
