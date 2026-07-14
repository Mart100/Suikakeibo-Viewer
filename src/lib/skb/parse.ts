import { unzipSync, strFromU8 } from 'fflate';
import type {
	NormalizedTrip,
	ResolvedStation,
	SkbDatabase,
	SkbStationCode,
	StationIndex
} from './types';
import { categorizeTransaction, localParts, stationKey } from './utils';

function isSkbDatabase(value: unknown): value is SkbDatabase {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return Array.isArray(v.cards) && Array.isArray(v.records);
}

export async function parseSkbFile(file: File | ArrayBuffer): Promise<SkbDatabase> {
	const buffer = file instanceof File ? await file.arrayBuffer() : file;
	const bytes = new Uint8Array(buffer);

	if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
		throw new Error('Not a valid .skb backup (expected ZIP archive)');
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error('Failed to unzip .skb file');
	}

	const dbEntry =
		unzipped['db.json'] ??
		Object.entries(unzipped).find(([name]) => name.endsWith('db.json'))?.[1];

	if (!dbEntry) {
		throw new Error('db.json not found inside .skb backup');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(strFromU8(dbEntry));
	} catch {
		throw new Error('db.json is not valid JSON');
	}

	if (!isSkbDatabase(parsed)) {
		throw new Error('db.json does not look like a Suikakeibo backup');
	}

	return parsed;
}

function resolveStation(
	code: SkbStationCode | null | undefined,
	index: StationInfoMap
): ResolvedStation | null {
	if (!code) return null;
	const key = stationKey(code.regionCode, code.lineCode, code.stationCode);
	const info = index[key];
	if (info) {
		return {
			key,
			name: info.name,
			line: info.line,
			company: info.company,
			lat: info.lat,
			lng: info.lng,
			known: info.lat != null && info.lng != null
		};
	}
	const label =
		code.lineCode != null
			? `Unknown (r${code.regionCode ?? '?'}/l${code.lineCode}/s${code.stationCode})`
			: `Unknown (#${code.stationCode})`;
	return {
		key,
		name: label,
		known: false
	};
}

type StationInfoMap = StationIndex;

export function normalizeTrips(db: SkbDatabase, stations: StationIndex): NormalizedTrip[] {
	const trips: NormalizedTrip[] = [];

	for (const record of db.records) {
		const tx = record.transaction;
		if (!tx || tx.transactionType !== 'SuicaTransaction') continue;

		const { date, localIso, hasClockTime } = localParts(
			tx.startedAt.unixMillis,
			tx.startedAt.offsetMillis
		);

		const start = resolveStation(tx.startStationCode, stations);
		const exit = resolveStation(tx.exitStationCode, stations);
		const category = categorizeTransaction(
			tx.processCode,
			tx.exitStationCode != null,
			tx.rawFare
		);

		trips.push({
			id: tx.id,
			cardId: record.cardId,
			serialNumber: tx.serialNumber,
			processCode: tx.processCode,
			consoleCode: tx.consoleCode,
			category,
			fare: tx.rawFare,
			balance: tx.balance?.amount ?? 0,
			currencyCode: tx.balance?.currencyCode ?? 'JPY',
			isMissingFare: tx.isMissingFare,
			date,
			localIso,
			hasClockTime,
			start,
			exit,
			raw: tx
		});
	}

	// Newest serial first is typical card order; for timeline we sort ascending by date then serial
	trips.sort((a, b) => {
		if (a.date !== b.date) return a.date.localeCompare(b.date);
		if (a.hasClockTime && b.hasClockTime) return a.localIso.localeCompare(b.localIso);
		return a.serialNumber - b.serialNumber;
	});

	return trips;
}

export function loadStationIndex(base: string): Promise<StationIndex> {
	const path = `${base}/data/stations.json`;
	return fetch(path).then(async (res) => {
		if (!res.ok) throw new Error(`Failed to load station index (${res.status})`);
		return (await res.json()) as StationIndex;
	});
}
