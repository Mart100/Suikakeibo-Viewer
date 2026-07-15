<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { history } from '$lib/history.svelte';
	import UploadDropzone from '$lib/components/UploadDropzone.svelte';
	import RangeControls from '$lib/components/RangeControls.svelte';
	import StatsOverview from '$lib/components/StatsOverview.svelte';
	import BarChart from '$lib/components/Charts/BarChart.svelte';
	import TimelineMap from '$lib/components/TimelineMap.svelte';
	import TripList from '$lib/components/TripList.svelte';
	import {
		availableDates,
		availableMonths,
		categoryBreakdown,
		computeOverview,
		filterTripsByRange,
		spendByMonth,
		topOdPairs,
		topStations,
		tripsByWeekday
	} from '$lib/analysis/stats';
	import { formatYen } from '$lib/skb/utils';

	type Tab = 'map' | 'stats' | 'trips';

	let tab = $state<Tab>('map');
	let activeIndex = $state(0);

	const filtered = $derived(
		history.data ? filterTripsByRange(history.data.trips, history.range) : []
	);
	const overview = $derived(computeOverview(filtered));
	const dates = $derived(history.data ? availableDates(history.data.trips) : []);
	const months = $derived(history.data ? availableMonths(history.data.trips) : []);

	onMount(async () => {
		await history.initStations(base);
		await history.restoreFromIdb();
	});

	function setRange(range: Parameters<typeof history.setRange>[0]) {
		activeIndex = 0;
		history.setRange(range);
	}
</script>

<main>
	<header class="hero">
		<div>
			<p class="eyebrow">Private IC card analysis</p>
			<h1>Suikakeibo Viewer</h1>
			<p class="lede">
				Upload a Suikakeibo `.skb` backup to explore your Suica / ICOCA / PASMO history on a map
				timeline — with spend stats. Everything stays in your browser.
			</p>
		</div>
		{#if history.data}
			<button class="ghost" onclick={() => history.clear()}>Clear data</button>
		{/if}
	</header>

	{#if history.error}
		<p class="error" role="alert">{history.error}</p>
	{/if}

	{#if !history.data}
		<section class="upload">
			{#if !history.stationsReady && !history.error}
				<p class="status">Loading station database…</p>
			{:else}
				<UploadDropzone
					onfile={(f) => history.loadFile(f)}
					disabled={history.loading || !history.stationsReady}
				/>
			{/if}
			{#if history.loading}
				<p class="status">Reading backup…</p>
			{/if}
			<ol class="howto">
				<li>In Suikakeibo, export a backup (`.skb`).</li>
				<li>Drop it here — nothing is uploaded to a server.</li>
				<li>Browse the map by day, month, or full history.</li>
			</ol>
		</section>
	{:else}
		<section class="toolbar">
			<div class="file-meta">
				<strong>{history.data.fileName}</strong>
				<span>
					{history.data.cards.map((c) => c.type || c.title || c.id).join(', ')} ·
					{history.data.trips.length} records
				</span>
			</div>
			<RangeControls
				range={history.range}
				{dates}
				{months}
				onchange={setRange}
			/>
		</section>

		<nav class="tabs" aria-label="Views">
			<button class:active={tab === 'map'} onclick={() => (tab = 'map')}>Map</button>
			<button class:active={tab === 'stats'} onclick={() => (tab = 'stats')}>Stats</button>
			<button class:active={tab === 'trips'} onclick={() => (tab = 'trips')}>Trips</button>
		</nav>

		{#if tab === 'map'}
			<section class="panel">
				<TimelineMap trips={filtered} range={history.range} bind:activeIndex />
			</section>
		{:else if tab === 'stats'}
			<section class="panel stack">
				<StatsOverview stats={overview} />
				<div class="charts">
					{#if history.range.mode === 'all'}
						<BarChart title="Spend by month" data={spendByMonth(filtered)} formatValue={formatYen} />
					{/if}
					{#if history.range.mode !== 'day'}
						<BarChart title="Trips by weekday" data={tripsByWeekday(filtered)} />
					{/if}
					<BarChart title="Top stations" data={topStations(filtered)} horizontal />
					<BarChart title="Top routes" data={topOdPairs(filtered)} horizontal />
					<BarChart title="By category" data={categoryBreakdown(filtered)} />
				</div>
			</section>
		{:else}
			<section class="panel">
				<TripList trips={filtered} />
			</section>
		{/if}
	{/if}

	<footer>
		<p>
			Built for GitHub Pages · station names from community Saibane dumps · coordinates via open JP
			railway data · map © OpenStreetMap
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1.75rem 1.15rem 3rem;
	}
	.hero {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}
	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--accent);
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 2.85rem);
		line-height: 1.05;
		letter-spacing: -0.02em;
	}
	.lede {
		margin: 0.7rem 0 0;
		max-width: 38rem;
		color: var(--muted);
		line-height: 1.5;
	}
	.ghost {
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 999px;
		padding: 0.45rem 0.9rem;
		cursor: pointer;
		color: var(--ink);
		white-space: nowrap;
	}
	.error {
		background: #fef3f2;
		border: 1px solid #fecdca;
		color: var(--danger);
		padding: 0.75rem 1rem;
		border-radius: 10px;
	}
	.upload {
		display: grid;
		gap: 1rem;
	}
	.status {
		margin: 0;
		color: var(--muted);
	}
	.howto {
		margin: 0;
		padding-left: 1.2rem;
		color: var(--muted);
		line-height: 1.6;
	}
	.toolbar {
		display: grid;
		gap: 0.85rem;
		margin-bottom: 1rem;
		padding: 1rem;
		background: color-mix(in oklab, var(--surface) 90%, transparent);
		border: 1px solid var(--border);
		border-radius: 16px;
	}
	.file-meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.file-meta span {
		color: var(--muted);
		font-size: 0.88rem;
	}
	.tabs {
		display: inline-flex;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}
	.tabs button {
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 10px;
		padding: 0.5rem 0.95rem;
		cursor: pointer;
		font-weight: 600;
		color: var(--muted);
	}
	.tabs button.active {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--paper);
	}
	.panel {
		margin-bottom: 1.5rem;
	}
	.stack {
		display: grid;
		gap: 1rem;
	}
	.charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.85rem;
	}
	footer {
		margin-top: 2rem;
		color: var(--muted);
		font-size: 0.8rem;
	}
	footer p {
		margin: 0;
		max-width: 42rem;
		line-height: 1.45;
	}
</style>
