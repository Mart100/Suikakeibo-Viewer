import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const rawBase = process.env.BASE_PATH ?? '';
const base = (rawBase === '' || rawBase.startsWith('/') ? rawBase : `/${rawBase}`) as
	| ''
	| `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				fallback: '404.html',
				pages: 'build',
				assets: 'build',
				precompress: false,
				strict: true
			}),
			paths: {
				base
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	]
});
