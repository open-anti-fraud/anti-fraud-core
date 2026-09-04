import { useCallback, useState } from 'react';

export default function useError() {
    const [error, setError] = useState<Error | undefined>();

    const handleError = useCallback((error: Error) => setError(error), []);
    const resetError = useCallback(() => setError(undefined), []);

    return {
        error,
        handleError,
        resetError,
    };
}
