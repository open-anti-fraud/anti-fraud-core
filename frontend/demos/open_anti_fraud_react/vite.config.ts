import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

const BACKEND_URL = '';

const proxy: Record<string, string | ProxyOptions> = {};

['/publicapi/', '/lrs/', '/platform/', '/api/', '/utils'].forEach((endpoint) => {
	proxy[endpoint] = {
		target: BACKEND_URL,
		changeOrigin: true,
		secure: false,
	};
});

['/lrs', '/utils'].forEach((endpoint) => {
	proxy[endpoint] = {
		target: BACKEND_URL,
		changeOrigin: true,
		ws: true,
		secure: false,
	};
});

[
	'/template-extractor',
	'/liveness-estimator',
	'/verify-matcher',
	'/face-detector-face-fitter',
	'/face-detector-template-extractor',
	'/face-detector-liveness-estimator',
	'/deepfake-estimator',
].forEach((endpoint) => {
	proxy[endpoint] = {
		target: BACKEND_URL,
		changeOrigin: true,
		secure: false,
	};
});

export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 5174,
		strictPort: true,
		proxy: {
			...proxy,
		},
	},

	plugins: [react(), basicSsl()],
});
