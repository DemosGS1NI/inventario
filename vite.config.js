import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/tests/setup.js'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		deps: {
			optimizer: {
				web: {
					include: ['@testing-library/jest-dom']
				}
			}
		}
	}
});
