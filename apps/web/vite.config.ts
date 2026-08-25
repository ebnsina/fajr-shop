import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vite';
import type { KitConfig } from '@sveltejs/kit';

// Dev serves media from a local MinIO over http, which no https: source covers.
type CspSource = NonNullable<NonNullable<KitConfig['csp']>['directives']>['img-src'];

function devStorageOrigin(): NonNullable<CspSource> {
	const base = process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT;
	if (!base) return [];
	try {
		const { origin } = new URL(base);
		return origin.startsWith('http://') ? ([origin] as NonNullable<CspSource>) : [];
	} catch {
		return [];
	}
}

export default defineConfig({
	ssr: {
		// Native addon: cannot be bundled, resolved from node_modules at runtime.
		external: ['@node-rs/argon2'],
		// Lucide ships raw .svelte files, so SSR must compile them rather than
		// hand them to Node, which has no loader for that extension.
		noExternal: ['@hugeicons/svelte']
	},
	plugins: [
		// Compiled, tree-shaken messages: only the strings a page uses ship, which matters on a Dhaka
		// mobile connection.
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
			cookieName: 'admin-locale'
		}),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

				// CSP belongs to SvelteKit, not to a hand-written header: it is what
				// knows the nonce for its own inline hydration script.
				csp: {
					mode: 'auto',
					directives: {
						'default-src': ['self'],
						'base-uri': ['self'],
						'object-src': ['none'],
						'frame-ancestors': ['none'],
						'form-action': ['self'],
						// https: covers the production CDN; the dev MinIO is plain http.
						'img-src': ['self', 'data:', 'blob:', 'https:', ...devStorageOrigin()],
						'font-src': ['self', 'data:'],
						// Svelte scopes styles inline, so this one cannot be tightened.
						'style-src': ['self', 'unsafe-inline'],
						// The video block embeds YouTube's privacy-mode player.
						'frame-src': ['https://www.youtube-nocookie.com'],
						'connect-src': ['self']
					}
				}
		})
	]
});
