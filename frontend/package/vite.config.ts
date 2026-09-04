import { resolve } from 'path';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'src/onboarding.ts'),
            name: 'TDVCFaceOnboarding',
            fileName: 'onboarding',
            cssFileName: 'css/style',
        },
        sourcemap: mode === 'production' ? false : 'inline',
        copyPublicDir: false,
    },

    worker: {
        format: 'es',
    },

    test: {
        root: './src',
        environment: 'jsdom',
        setupFiles: ['../utils/tests/vitest_setup.ts'],
        coverage: {
            exclude: [...coverageConfigDefaults.exclude],
        },
    },
}));
