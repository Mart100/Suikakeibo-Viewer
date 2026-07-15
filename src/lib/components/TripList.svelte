<script lang="ts">
	import type { NormalizedTrip } from '$lib/skb/types';
	import { formatYen } from '$lib/skb/utils';

	let { trips }: { trips: NormalizedTrip[] } = $props();

	const sorted = $derived([...trips].reverse());
</script>

<div class="list">
	{#if sorted.length === 0}
		<p class="empty">No trips in this range.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Type</th>
					<th>From</th>
					<th>To</th>
					<th>Fare</th>
					<th>Balance</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted as trip (trip.id)}
					<tr>
						<td>
							{trip.date}
							{#if trip.hasClockTime}
								<span class="time">{trip.localIso.slice(11, 16)}</span>
							{/if}
						</td>
						<td><span class="tag {trip.category}">{trip.category}</span></td>
						<td>
							{#if trip.start}
								<span class:muted={!trip.start.known}>{trip.start.name}</span>
							{:else}
								—
							{/if}
						</td>
						<td>
							{#if trip.exit}
								<span class:muted={!trip.exit.known}>{trip.exit.name}</span>
							{:else}
								—
							{/if}
						</td>
						<td class="num">{formatYen(trip.fare)}</td>
						<td class="num">{formatYen(trip.balance)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.list {
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		max-height: 36rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}
	th,
	td {
		padding: 0.55rem 0.7rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}
	th {
		position: sticky;
		top: 0;
		background: var(--surface-2);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.time {
		display: block;
		color: var(--muted);
		font-size: 0.75rem;
	}
	.muted {
		color: var(--muted);
		font-style: italic;
	}
	.tag {
		display: inline-block;
		padding: 0.12rem 0.45rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		background: var(--surface-2);
	}
	.tag.train {
		background: #ccfbf1;
		color: #115e59;
	}
	.tag.bus {
		background: #e0e7ff;
		color: #3730a3;
	}
	.tag.charge {
		background: #dcfce7;
		color: #166534;
	}
	.tag.purchase {
		background: #ffedd5;
		color: #9a3412;
	}
	.empty {
		margin: 0;
		padding: 1.25rem;
		color: var(--muted);
	}
</style>
