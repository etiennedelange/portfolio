import type { Config } from '@sveltejs/adapter-vercel';
import { getProjects } from '$lib/server/github';
import type { PageServerLoad } from './$types';

// Vercel ISR: serve the cached page, regenerate in the background at most once an hour.
export const config: Config = {
	isr: { expiration: 3600 }
};

export const load: PageServerLoad = async ({ fetch }) => {
	return { projects: await getProjects(fetch) };
};
