<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
	import type { Feature, FeatureCollection } from 'geojson';
	import type { NormalizedTrip, ViewRange } from '$lib/skb/types';
	import { buildCorridors, mappableLegs } from '$lib/analysis/stats';
	import { formatYen } from '$lib/skb/utils';
	import { routeTitle } from '$lib/skb/labels';

	let {
		trips,
		range,
		activeIndex = $bindable(0)
	}: {
		trips: NormalizedTrip[];
		range: ViewRange;
		activeIndex?: number;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let map: MapLibreMap | null = null;
	let ready = $state(false);
	let maplibre: typeof import('maplibre-gl') | null = null;

	const legs = $derived(mappableLegs(trips));
	const corridors = $derived(buildCorridors(trips));

	$effect(() => {
		if (!container || map) return;
		let cancelled = false;

		(async () => {
			maplibre = await import('maplibre-gl');
			if (cancelled || !container || map) return;

			map = new maplibre.Map({
				container,
				style: {
					version: 8,
					sources: {
						osm: {
							type: 'raster',
							tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution: '© OpenStreetMap contributors'
						}
					},
					layers: [
						{
							id: 'osm',
							type: 'raster',
							source: 'osm'
						}
					]
				},
				center: [135.5, 34.7],
				zoom: 5
			});

			map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

			map.on('load', () => {
				if (!map) return;
				map.addSource('legs', {
					type: 'geojson',
					data: emptyFc()
				});
				map.addSource('stations', {
					type: 'geojson',
					data: emptyFc()
				});
				map.addLayer({
					id: 'leg-lines',
					type: 'line',
					source: 'legs',
					paint: {
						'line-color': ['get', 'color'],
						'line-width': ['get', 'width'],
						'line-opacity': ['get', 'opacity']
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					}
				});
				map.addLayer({
					id: 'station-circles',
					type: 'circle',
					source: 'stations',
					paint: {
						'circle-radius': ['get', 'radius'],
						'circle-color': '#0f766e',
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ecfdf5'
					}
				});
				ready = true;
				paint();
			});
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		trips;
		range;
		activeIndex;
		if (ready) paint();
	});

	onDestroy(() => {
		map?.remove();
		map = null;
	});

	function emptyFc(): FeatureCollection {
		return { type: 'FeatureCollection', features: [] };
	}

	function dayColor(date: string): string {
		const day = Number(date.slice(-2)) || 1;
		const hues = [168, 196, 32, 24, 280, 210, 140];
		return `hsl(${hues[day % hues.length]} 55% 38%)`;
	}

	function paint() {
		if (!map || !ready || !maplibre) return;

		const legSource = map.getSource('legs') as GeoJSONSource | undefined;
		const stationSource = map.getSource('stations') as GeoJSONSource | undefined;
		if (!legSource || !stationSource) return;

		const lineFeatures: Feature[] = [];
		const stationMap = new Map<string, Feature>();

		if (range.mode === 'all' || range.mode === 'month') {
			for (const c of corridors) {
				const opacity = range.mode === 'all' ? Math.min(0.85, 0.25 + c.count * 0.12) : 0.7;
				const width = range.mode === 'all' ? Math.min(8, 2 + c.count) : 3.5;
				lineFeatures.push({
					type: 'Feature',
					properties: {
						color: dayColor(c.dates[0] ?? '2024-01-01'),
						width,
						opacity,
						label: `${c.fromName} ↔ ${c.toName} (${c.count})`
					},
					geometry: {
						type: 'LineString',
						coordinates: [c.from, c.to]
					}
				});
				for (const [name, coord] of [
					[c.fromName, c.from],
					[c.toName, c.to]
				] as const) {
					const key = coord.join(',');
					if (!stationMap.has(key)) {
						stationMap.set(key, {
							type: 'Feature',
							properties: { name, radius: 5 },
							geometry: { type: 'Point', coordinates: coord }
						});
					}
				}
			}
		} else {
			legs.forEach((leg, i) => {
				const active = i === activeIndex;
				lineFeatures.push({
					type: 'Feature',
					properties: {
						color: active ? '#0f766e' : '#64748b',
						width: active ? 5 : 2.5,
						opacity: active ? 0.95 : 0.45,
						label: `${leg.start!.name} → ${leg.exit!.name}`
					},
					geometry: {
						type: 'LineString',
						coordinates: [
							[leg.start!.lng!, leg.start!.lat!],
							[leg.exit!.lng!, leg.exit!.lat!]
						]
					}
				});
				for (const s of [leg.start!, leg.exit!]) {
					const key = `${s.lng},${s.lat}`;
					stationMap.set(key, {
						type: 'Feature',
						properties: { name: s.name, radius: active ? 7 : 5 },
						geometry: { type: 'Point', coordinates: [s.lng!, s.lat!] }
					});
				}
			});
		}

		legSource.setData({ type: 'FeatureCollection', features: lineFeatures });
		stationSource.setData({
			type: 'FeatureCollection',
			features: [...stationMap.values()]
		});

		const bounds = new maplibre.LngLatBounds();
		let has = false;
		for (const f of lineFeatures) {
			if (f.geometry.type !== 'LineString') continue;
			for (const c of f.geometry.coordinates) {
				bounds.extend(c as [number, number]);
				has = true;
			}
		}
		if (has) {
			map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 600 });
		}
	}

	function selectLeg(i: number) {
		activeIndex = i;
	}
</script>

<div class="timeline">
	<div class="map-wrap">
		<div class="map" bind:this={container}></div>
		{#if legs.length === 0 && corridors.length === 0}
			<div class="overlay">
				<p>No mappable train/bus legs in this range.</p>
				<p class="note">Paths are straight lines between stations (approximate).</p>
			</div>
		{/if}
	</div>

	<aside class="side">
		<header>
			<h3>Trips</h3>
			<p class="note">
				{#if range.mode === 'day'}
					Train times are date-only on Suica; order uses card serial / bus clock time.
				{:else}
					Paths are approximate straight lines between stations.
				{/if}
			</p>
		</header>

		{#if range.mode === 'day'}
			{#if legs.length === 0}
				<p class="empty">No mapped legs this day.</p>
			{:else}
				<div class="scrubber">
					<input
						type="range"
						min="0"
						max={Math.max(0, legs.length - 1)}
						value={activeIndex}
						oninput={(e) => (activeIndex = Number(e.currentTarget.value))}
					/>
					<span>{activeIndex + 1} / {legs.length}</span>
				</div>
				<ol>
					{#each legs as leg, i (leg.id)}
						<li>
							<button class:active={i === activeIndex} onclick={() => selectLeg(i)}>
								<span class="route" title={routeTitle(leg.start, leg.exit)}
									>{leg.start?.name} → {leg.exit?.name}</span
								>
								<span class="meta">
									{#if leg.hasClockTime}
										{leg.localIso.slice(11, 16)} ·
									{/if}
									{formatYen(leg.fare)}
								</span>
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		{:else}
			<ol>
				{#each corridors.slice(0, 40) as c (c.key)}
					<li class="corridor" title={c.tip}>
						<span class="route">{c.fromName} ↔ {c.toName}</span>
						<span class="meta">{c.count}×</span>
					</li>
				{/each}
			</ol>
		{/if}
	</aside>
</div>

<style>
	.timeline {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(16rem, 0.9fr);
		gap: 0.85rem;
		min-height: 28rem;
	}
	@media (max-width: 860px) {
		.timeline {
			grid-template-columns: 1fr;
		}
	}
	.map-wrap {
		position: relative;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--border);
		min-height: 22rem;
		background: #dbe4ea;
	}
	.map {
		position: absolute;
		inset: 0;
	}
	.overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		background: color-mix(in oklab, var(--paper) 72%, transparent);
		padding: 1.5rem;
		text-align: center;
		pointer-events: none;
		z-index: 2;
	}
	.overlay p {
		margin: 0.2rem 0;
		color: var(--ink);
	}
	.side {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		min-height: 22rem;
		max-height: 34rem;
		overflow: hidden;
	}
	header h3 {
		margin: 0;
		font-size: 1rem;
	}
	.note {
		margin: 0.35rem 0 0.7rem;
		font-size: 0.78rem;
		color: var(--muted);
		line-height: 1.35;
	}
	.scrubber {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.6rem;
	}
	.scrubber input {
		flex: 1;
	}
	.scrubber span {
		font-size: 0.8rem;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: auto;
		display: grid;
		gap: 0.35rem;
	}
	button {
		width: 100%;
		text-align: left;
		border: 1px solid transparent;
		background: var(--surface-2);
		border-radius: 10px;
		padding: 0.55rem 0.65rem;
		cursor: pointer;
		display: grid;
		gap: 0.15rem;
		color: inherit;
		font: inherit;
	}
	button.active {
		border-color: var(--accent);
		background: color-mix(in oklab, var(--accent) 14%, var(--surface));
	}
	.route {
		font-size: 0.88rem;
		font-weight: 600;
	}
	.meta {
		font-size: 0.75rem;
		color: var(--muted);
	}
	.corridor {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.45rem 0.35rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.86rem;
	}
	.empty {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
