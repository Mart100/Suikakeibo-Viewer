<script lang="ts">
	import type { OverviewStats } from '$lib/analysis/stats';
	import { formatYen } from '$lib/skb/utils';

	let { stats }: { stats: OverviewStats } = $props();

	const cards = $derived([
		{ label: 'Trips', value: String(stats.tripCount) },
		{ label: 'Spend', value: formatYen(stats.spend) },
		{ label: 'Top-ups', value: formatYen(stats.topUps) },
		{ label: 'Avg fare', value: formatYen(stats.avgFare) },
		{ label: 'Stations', value: String(stats.uniqueStations) },
		{ label: 'Mapped legs', value: String(stats.mappedLegs) }
	]);
</script>

<div class="overview">
	{#each cards as card (card.label)}
		<div class="stat">
			<span class="label">{card.label}</span>
			<span class="value">{card.value}</span>
		</div>
	{/each}
	{#if stats.dateFrom && stats.dateTo}
		<p class="range">{stats.dateFrom} → {stats.dateTo} · {stats.trainCount} train · {stats.busCount} bus</p>
	{/if}
</div>

<style>
	.overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 0.65rem;
	}
	.stat {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.75rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-weight: 600;
	}
	.value {
		font-family: var(--font-display);
		font-size: 1.25rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.range {
		grid-column: 1 / -1;
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.88rem;
	}
</style>
