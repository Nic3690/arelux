import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),

		alias: {
			$shad: './src/shadcn',
		},

		prerender: {
			entries: [
				'/',
				'/redo',
				'/redo/admin',
				'/redo/admin/add',
				'/redo/admin/familyadd',
				'/redo/admin/systemadd',
				'/redo/admin/systemselect',
				'/redo/login',
				'/redo/test',
				'/arelux-italia',
				'/arelux-italia/admin',
				'/arelux-italia/admin/add',
				'/arelux-italia/admin/familyadd',
				'/arelux-italia/admin/systemadd',
				'/arelux-italia/admin/systemselect',
				'/arelux-italia/login',
				'/arelux-italia/test',
			],
		},
	},
};

export default config;
