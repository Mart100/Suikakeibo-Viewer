<script lang="ts">
	import type { NamedCount } from '$lib/analysis/stats';

	let {
		title,
		data,
		formatValue = (v: number) => String(v),
		horizontal = false
	}: {
		title: string;
		data: NamedCount[];
		formatValue?: (v: number) => string;
		horizontal?: boolean;
	} = $props();

	const max = $derived(Math.max(1, ...data.map((d) => d.value)));
</script>

<section class="chart">
	<h3>{title}</h3>
	{#if data.length === 0}
		<p class="empty">No data in this range</p>
	{:else if horizontal}
		<ul class="bars">
			{#each data as row (row.label)}
				<li>
					<span class="label" title={row.label}>{row.label}</span>
					<div class="track">
						<div class="fill" style={`width: ${(row.value / max) * 100}%`}></div>
					</div>
					<span class="value">{formatValue(row.value)}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="columns" style={`--n: ${data.length}`}>
			{#each data as row (row.label)}
				<div class="col">
					<div class="col-bar-wrap">
						<div class="col-bar" style={`height: ${(row.value / max) * 100}%`} title={formatValue(row.value)}></div>
					</div>
					<span class="col-label">{row.label}</span>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.chart {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 1rem 1.1rem 1.15rem;
		min-height: 12rem;
	}
	h3 {
		margin: 0 0 0.85rem;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--ink);
	}
	.empty {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.bars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.45rem;
	}
	.bars li {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr) auto;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.82rem;
	}
	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--ink);
	}
	.track {
		height: 0.55rem;
		background: var(--surface-2);
		border-radius: 999px;
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent), var(--accent-2));
		border-radius: 999px;
	}
	.value {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.columns {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 0.35rem;
		align-items: end;
		height: 9rem;
	}
	.col {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		min-width: 0;
	}
	.col-bar-wrap {
		flex: 1;
		width: 70%;
		display: flex;
		align-items: flex-end;
	}
	.col-bar {
		width: 100%;
		min-height: 2px;
		background: linear-gradient(180deg, var(--accent-2), var(--accent));
		border-radius: 6px 6px 2px 2px;
	}
	.col-label {
		margin-top: 0.35rem;
		font-size: 0.68rem;
		color: var(--muted);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
	}
</style>
