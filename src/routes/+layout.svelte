<script lang="ts">
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import '$lib/styles/app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Suikakeibo Viewer</title>
	<meta
		name="description"
		content="Analyze Suikakeibo IC card backups privately in your browser — map timeline, stats, and trip history."
	/>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="{base}/logo.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
