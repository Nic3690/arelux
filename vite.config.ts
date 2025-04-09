import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: { 
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					three: ['three'],
					vendor: ['lodash']
				}
			}
		}
	},
	optimizeDeps: {
		include: ['lodash', 'three'],
	},
	server: {
		port: 3000,
		open: true,
	}
});