import type { Handle } from '@sveltejs/kit';
import { PALETTE_ANCHORS } from '$lib/palette';

const serialised = JSON.stringify(PALETTE_ANCHORS);

// CSP itself is set via kit.csp in svelte.config.js so it can carry nonces.
const securityHeaders = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('/*palette*/[]', serialised)
	});
	for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
	return response;
};
