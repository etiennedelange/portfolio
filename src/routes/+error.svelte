<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Page not found' : 'Something went wrong'} – Etienne de Lange</title>
</svelte:head>

<main class="flex min-h-screen items-center px-6">
	<div class="mx-auto w-full max-w-6xl">
		<p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--c-muted);">
			Error / {page.status}
		</p>
		<h1 class="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
			{notFound ? 'Nothing lives here.' : 'Something broke.'}
		</h1>
		<p class="text-lg max-w-xl leading-relaxed mb-10" style="color: var(--c-muted);">
			{notFound
				? "The page you're looking for doesn't exist or has moved."
				: (page.error?.message ?? 'An unexpected error occurred. Try again in a moment.')}
		</p>
		<div class="flex flex-wrap gap-4">
			<a
				href={resolve('/')}
				class="neo-btn px-6 py-3 inline-block"
				style="background-color: var(--c-accent); color: #0a0a0a;"
			>
				Back to home
			</a>
			{#if !notFound}
				<button
					type="button"
					onclick={() => location.reload()}
					class="neo-btn px-6 py-3"
					style="background-color: var(--c-bg);"
				>
					Try again
				</button>
			{/if}
		</div>
	</div>
</main>
