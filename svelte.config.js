import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Centralizza la configurazione dei tenant per facilitare la manutenzione
const tenants = ['redo', 'arelux-italia'];
const baseRoutes = ['', '/admin', '/admin/add', '/admin/familyadd', '/admin/systemadd', '/admin/systemselect', '/login', '/test'];

// Genera dinamicamente le voci di prerendering
const generatePrerenderEntries = () => {
	const entries = ['/'];
	
	tenants.forEach(tenant => {
		baseRoutes.forEach(route => {
			entries.push(`/${tenant}${route}`);
		});
	});
	
	return entries;
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		alias: {
			$lib: './src/lib',
			$components: './src/components',
			$stores: './src/stores',
			$utils: './src/utils'
		},

		prerender: {
			entries: generatePrerenderEntries()
		}
	}
};

export default config;