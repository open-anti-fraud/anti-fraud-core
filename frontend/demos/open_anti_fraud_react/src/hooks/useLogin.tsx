import { useCallback, useState } from 'react';

export default function useLogin() {
	const [hasLogged, setHasLogged] = useState(false);

	const login = useCallback(() => setHasLogged(true), []);
	const logout = useCallback(() => setHasLogged(false), []);

	return {
		hasLogged,
		login,
		logout,
	};
}
