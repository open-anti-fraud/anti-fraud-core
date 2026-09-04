import { useState } from 'react';

export default function useLoading(defaultState: false) {
    const [isLoading, setLoading] = useState<boolean>(defaultState);

    return {
        isLoading,
        setLoading,
    };
}
