<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import spaceGroteskLatin from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="preload" href={spaceGroteskLatin} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>
{@render children()}
