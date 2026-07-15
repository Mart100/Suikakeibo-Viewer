/**
 * Builds static/data/stations.json by joining Saibane codes to coordinates + romaji.
 *
 * Sources:
 * - Saibane names: m2wasabi/nfcpy-suica-sample StationCode.csv
 * - Coordinates / ODPT codes: piuccio/open-data-jp-railway-stations
 * - Romaji fallback: kuroshiro (build-time)
 *
 * Run: bun run scripts/build-stations.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

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
	romaji?: string;
};

type OpenStationGroup = {
	name_kanji?: string;
	stations?: { name_kanji?: string; lat?: number; lon?: number; code?: string }[];
};

function normalizeName(name: string): string {
	return name
		.replace(/\s+/g, '')
		.replace(/駅$/, '')
		.replace(/（.*?）/g, '')
		.replace(/\(.*?\)/g, '')
		.replace(/[ヶケヵ]/g, 'ケ')
		.normalize('NFKC');
}

function romajiFromOdptCode(code: string | undefined): string | null {
	if (!code) return null;
	const last = code.split('.').at(-1);
	if (!last || !/^[A-Za-z]/.test(last)) return null;
	if (/^[A-Z]{1,3}-?\d+$/i.test(last)) return null;
	return last.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function titleCaseRomaji(value: string): string {
	return value
		.trim()
		.replace(/\s+/g, ' ')
		.split(' ')
		.map((word) => {
			if (!word) return word;
			if (/^[(\[]/.test(word)) {
				return word[0] + titleCaseRomaji(word.slice(1));
			}
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ')
		.replace(/\s+([)\]])/g, '$1')
		.replace(/([(])\s+/g, '$1');
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

function buildOpenIndex(groups: OpenStationGroup[]): {
	coords: Map<string, { lat: number; lng: number }>;
	romaji: Map<string, string>;
} {
	const coords = new Map<string, { lat: number; lng: number }>();
	const romaji = new Map<string, string>();

	for (const g of groups) {
		for (const s of g.stations ?? []) {
			const name = s.name_kanji ?? g.name_kanji;
			if (!name) continue;
			const key = normalizeName(name);
			if (s.lat != null && s.lon != null && !coords.has(key)) {
				coords.set(key, { lat: s.lat, lng: s.lon });
			}
			const r = romajiFromOdptCode(s.code);
			if (r && !romaji.has(key)) {
				romaji.set(key, titleCaseRomaji(r));
			}
		}
	}
	return { coords, romaji };
}

async function main() {
	console.log('Downloading Saibane CSV…');
	const csv = await fetchText(SAIBANE_URL);
	const saibane = parseSaibaneCsv(csv);
	console.log(`Saibane stations: ${saibane.size}`);

	console.log('Downloading open-data-jp stations…');
	const openStations = await fetchJson<OpenStationGroup[]>(STATIONS_URL);
	const { coords, romaji } = buildOpenIndex(openStations);
	console.log(`Coord names: ${coords.size}, ODPT romaji: ${romaji.size}`);

	console.log('Initializing kuroshiro for romaji fallback…');
	const kuroshiro = new Kuroshiro();
	await kuroshiro.init(new KuromojiAnalyzer());

	const uniqueNames = [...new Set([...saibane.values()].map((s) => s.name))];
	const romajiByName = new Map<string, string>();
	let fromOdpt = 0;
	let fromKuroshiro = 0;

	for (const name of uniqueNames) {
		const key = normalizeName(name);
		const odpt = romaji.get(key);
		if (odpt) {
			romajiByName.set(name, odpt);
			fromOdpt += 1;
			continue;
		}
		try {
			const raw = await kuroshiro.convert(name, {
				to: 'romaji',
				romajiSystem: 'passport',
				mode: 'spaced'
			});
			romajiByName.set(name, titleCaseRomaji(raw));
			fromKuroshiro += 1;
		} catch {
			// leave without romaji
		}
	}
	console.log(`Romaji: ODPT ${fromOdpt}, kuroshiro ${fromKuroshiro}`);

	const out: Record<string, StationInfo> = {};
	let withCoords = 0;
	let withRomaji = 0;
	for (const [key, info] of saibane) {
		const c = coords.get(normalizeName(info.name));
		const r = romajiByName.get(info.name);
		const entry: StationInfo = { ...info };
		if (c) {
			entry.lat = c.lat;
			entry.lng = c.lng;
			withCoords += 1;
		}
		if (r) {
			entry.romaji = r;
			withRomaji += 1;
		}
		out[key] = entry;
	}

	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, JSON.stringify(out));
	console.log(`Wrote ${OUT}`);
	console.log(
		`Total ${Object.keys(out).length}, with coords ${withCoords}, with romaji ${withRomaji}`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
