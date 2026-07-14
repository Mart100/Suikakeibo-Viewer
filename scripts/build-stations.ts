/**
 * Builds static/data/stations.json by joining Saibane codes to coordinates.
 *
 * Sources:
 * - Saibane names: m2wasabi/nfcpy-suica-sample StationCode.csv
 * - Coordinates: piuccio/open-data-jp-railway-stations stations.json
 *
 * Run: bun run scripts/build-stations.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'static', 'data', 'stations.json');

const SAIBANE_URL =
	'https://raw.githubusercontent.com/m2wasabi/nfcpy-suica-sample/master/StationCode.csv';
const STATIONS_URL =
	'https://raw.githubusercontent.com/piuccio/open-data-jp-railway-stations/master/stations.json';

type StationInfo = {
	name: string;
	line?: string;
	company?: string;
	lat?: number;
	lng?: number;
};

type OpenStationGroup = {
	name_kanji?: string;
	stations?: { name_kanji?: string; lat?: number; lon?: number }[];
};

function normalizeName(name: string): string {
	return name
		.replace(/\s+/g, '')
		.replace(/駅$/, '')
		.replace(/（.*?）/g, '')
		.replace(/\(.*?\)/g, '')
		.normalize('NFKC');
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return await res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return (await res.json()) as T;
}

function parseSaibaneCsv(csv: string): Map<string, StationInfo> {
	const map = new Map<string, StationInfo>();
	const lines = csv.split(/\r?\n/);
	for (const line of lines) {
		if (!line.trim()) continue;
		// format: region,line,station,company,lineName,stationName (hex or decimal)
		const parts = line.split(',');
		if (parts.length < 6) continue;
		const region = Number.parseInt(parts[0].trim(), 10);
		const lineCode = Number.parseInt(parts[1].trim(), 10);
		const stationCode = Number.parseInt(parts[2].trim(), 10);
		if (Number.isNaN(region) || Number.isNaN(lineCode) || Number.isNaN(stationCode)) continue;
		const company = parts[3].trim();
		const lineName = parts[4].trim();
		const stationName = parts[5].trim();
		if (!stationName) continue;
		const key = `${region}-${lineCode}-${stationCode}`;
		map.set(key, {
			name: stationName,
			line: lineName,
			company
		});
	}
	return map;
}

function buildCoordIndex(groups: OpenStationGroup[]): Map<string, { lat: number; lng: number }> {
	const index = new Map<string, { lat: number; lng: number }>();
	for (const g of groups) {
		for (const s of g.stations ?? []) {
			const name = s.name_kanji ?? g.name_kanji;
			if (!name || s.lat == null || s.lon == null) continue;
			const key = normalizeName(name);
			if (!index.has(key)) {
				index.set(key, { lat: s.lat, lng: s.lon });
			}
		}
		if (g.name_kanji && g.stations?.[0]?.lat != null && g.stations[0].lon != null) {
			const key = normalizeName(g.name_kanji);
			if (!index.has(key)) {
				index.set(key, { lat: g.stations[0].lat, lng: g.stations[0].lon });
			}
		}
	}
	return index;
}

async function main() {
	console.log('Downloading Saibane CSV…');
	const csv = await fetchText(SAIBANE_URL);
	const saibane = parseSaibaneCsv(csv);
	console.log(`Saibane stations: ${saibane.size}`);

	console.log('Downloading open-data-jp stations…');
	const openStations = await fetchJson<OpenStationGroup[]>(STATIONS_URL);
	const coords = buildCoordIndex(openStations);
	console.log(`Coord names: ${coords.size}`);

	const out: Record<string, StationInfo> = {};
	let withCoords = 0;
	for (const [key, info] of saibane) {
		const c = coords.get(normalizeName(info.name));
		if (c) {
			out[key] = { ...info, lat: c.lat, lng: c.lng };
			withCoords += 1;
		} else {
			out[key] = info;
		}
	}

	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, JSON.stringify(out));
	console.log(`Wrote ${OUT}`);
	console.log(`Total ${Object.keys(out).length}, with coords ${withCoords}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
