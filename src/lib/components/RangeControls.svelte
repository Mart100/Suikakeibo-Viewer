<script lang="ts">
	import type { ViewRange } from '$lib/skb/types';

	let {
		range,
		dates,
		months,
		onchange
	}: {
		range: ViewRange;
		dates: string[];
		months: string[];
		onchange: (range: ViewRange) => void;
	} = $props();

	function setMode(mode: ViewRange['mode']) {
		if (mode === 'day') {
			onchange({
				mode: 'day',
				day: range.day ?? dates[dates.length - 1]
			});
		} else if (mode === 'month') {
			onchange({
				mode: 'month',
				month: range.month ?? months[months.length - 1]
			});
		} else {
			onchange({ mode: 'all' });
		}
	}

	function shift(delta: number) {
		if (range.mode === 'day' && range.day) {
			const idx = dates.indexOf(range.day);
			const next = Math.min(dates.length - 1, Math.max(0, idx + delta));
			onchange({ mode: 'day', day: dates[next] });
		} else if (range.mode === 'month' && range.month) {
			const idx = months.indexOf(range.month);
			const next = Math.min(months.length - 1, Math.max(0, idx + delta));
			onchange({ mode: 'month', month: months[next] });
		}
	}
</script>

<div class="controls">
	<div class="modes" role="group" aria-label="Time range">
		<button class:active={range.mode === 'day'} onclick={() => setMode('day')}>Day</button>
		<button class:active={range.mode === 'month'} onclick={() => setMode('month')}>Month</button>
		<button class:active={range.mode === 'all'} onclick={() => setMode('all')}>All</button>
	</div>

	{#if range.mode === 'day'}
		<div class="nav">
			<button onclick={() => shift(-1)} aria-label="Previous day" disabled={dates.indexOf(range.day ?? '') <= 0}
				>‹</button
			>
			<input
				type="date"
				value={range.day}
				onchange={(e) => onchange({ mode: 'day', day: e.currentTarget.value })}
			/>
			<button
				onclick={() => shift(1)}
				aria-label="Next day"
				disabled={dates.indexOf(range.day ?? '') >= dates.length - 1}>›</button
			>
		</div>
	{:else if range.mode === 'month'}
		<div class="nav">
			<button
				onclick={() => shift(-1)}
				aria-label="Previous month"
				disabled={months.indexOf(range.month ?? '') <= 0}>‹</button
			>
			<input
				type="month"
				value={range.month}
				onchange={(e) => onchange({ mode: 'month', month: e.currentTarget.value })}
			/>
			<button
				onclick={() => shift(1)}
				aria-label="Next month"
				disabled={months.indexOf(range.month ?? '') >= months.length - 1}>›</button
			>
		</div>
	{:else}
		<p class="all-label">Entire history</p>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
		justify-content: space-between;
	}
	.modes {
		display: inline-flex;
		background: var(--surface-2);
		border-radius: 999px;
		padding: 0.2rem;
		gap: 0.15rem;
	}
	.modes button {
		border: 0;
		background: transparent;
		color: var(--muted);
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		cursor: pointer;
		font: inherit;
		font-weight: 600;
	}
	.modes button.active {
		background: var(--ink);
		color: var(--paper);
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.nav button {
		width: 2rem;
		height: 2rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		cursor: pointer;
		font-size: 1.1rem;
		color: var(--ink);
	}
	.nav button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.nav input {
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.4rem 0.55rem;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
	}
	.all-label {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}
</style>
