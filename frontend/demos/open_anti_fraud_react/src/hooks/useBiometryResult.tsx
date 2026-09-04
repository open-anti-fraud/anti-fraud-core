import { useCallback, useState } from 'react';
import type { BiometryResult } from '../domains';

export default function useBiometryResult() {
	const [data, setData] = useState<BiometryResult | undefined>(undefined);
	const [bestshot, setBestshot] = useState<string | undefined>(undefined);

	const handleData = useCallback(
		(data: BiometryResult) => {
			setData(data);
		},
		[setData],
	);

	const handleBestshot = useCallback(
		(bestshot: string) => {
			setBestshot(bestshot);
		},
		[setBestshot],
	);

	const reset = useCallback(() => {
		setData(undefined);
		setBestshot(undefined);
	}, [setData]);

	return {
		data,
		handleData,
		bestshot,
		handleBestshot,
		reset,
	};
}
