import type { NormalizedTrip, RangeMode, ViewRange } from '../skb/types';
import { WEEKDAYS, weekdayIndex } from '../skb/utils';

export function filterTripsByRange(trips: NormalizedTrip[], range: ViewRange): NormalizedTrip[] {
	if (range.mode === 'all') return trips;
	if (range.mode === 'day' && range.day) {
		return trips.filter((t) => t.date === range.day);
	}
	if (range.mode === 'month' && range.month) {
		return trips.filter((t) => t.date.startsWith(range.month!));
	}
	return trips;
}

export type OverviewStats = {
	tripCount: number;
	trainCount: number;
	busCount: number;
	spend: number;
	topUps: number;
	avgFare: number;
	uniqueStations: number;
	mappedLegs: number;
	dateFrom: string | null;
	dateTo: string | null;
};

export function computeOverview(trips: NormalizedTrip[]): OverviewStats {
	let spend = 0;
	let topUps = 0;
	let fareCount = 0;
	let fareSum = 0;
	let trainCount = 0;
	let busCount = 0;
	let mappedLegs = 0;
	const stations = new Set<string>();

	for (const t of trips) {
		if (t.fare > 0) {
			spend += t.fare;
			fareSum += t.fare;
			fareCount += 1;
		} else if (t.fare < 0) {
			topUps += -t.fare;
		}
		if (t.category === 'train') trainCount += 1;
		if (t.category === 'bus') busCount += 1;
		if (t.start?.known) stations.add(t.start.key);
		if (t.exit?.known) stations.add(t.exit.key);
		if (t.start?.known && t.exit?.known) mappedLegs += 1;
	}

	const dates = trips.map((t) => t.date).sort();
	return {
		tripCount: trips.length,
		trainCount,
		busCount,
		spend,
		topUps,
		avgFare: fareCount ? Math.round(fareSum / fareCount) : 0,
		uniqueStations: stations.size,
		mappedLegs,
		dateFrom: dates[0] ?? null,
		dateTo: dates[dates.length - 1] ?? null
	};
}

export type NamedCount = { label: string; value: number; tip?: string };

export function spendByMonth(trips: NormalizedTrip[]): NamedCount[] {
	const map = new Map<string, number>();
	for (const t of trips) {
		if (t.fare <= 0) continue;
		const month = t.date.slice(0, 7);
		map.set(month, (map.get(month) ?? 0) + t.fare);
	}
	return [...map.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([label, value]) => ({ label, value }));
}

export function tripsByWeekday(trips: NormalizedTrip[]): NamedCount[] {
	const counts = new Array(7).fill(0);
	for (const t of trips) {
		counts[weekdayIndex(t.date)] += 1;
	}
	return WEEKDAYS.map((label, i) => ({ label, value: counts[i] }));
}

export function topStations(trips: NormalizedTrip[], limit = 10): NamedCount[] {
	const map = new Map<string, { count: number; romaji?: string }>();
	const bump = (name: string, romaji?: string) => {
		const cur = map.get(name);
		if (cur) cur.count += 1;
		else map.set(name, { count: 1, romaji });
	};
	for (const t of trips) {
		if (t.start?.known) bump(t.start.name, t.start.romaji);
		if (t.exit?.known) bump(t.exit.name, t.exit.romaji);
	}
	return [...map.entries()]
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, limit)
		.map(([label, { count, romaji }]) => ({
			label,
			value: count,
			tip: romaji ? `${label} (${romaji})` : label
		}));
}

export function topOdPairs(trips: NormalizedTrip[], limit = 10): NamedCount[] {
	const map = new Map<string, { count: number; tip: string }>();
	for (const t of trips) {
		if (!t.start?.known || !t.exit?.known) continue;
		if (t.category !== 'train' && t.category !== 'bus') continue;
		const label = `${t.start.name} → ${t.exit.name}`;
		const fromR = t.start.romaji ? ` (${t.start.romaji})` : '';
		const toR = t.exit.romaji ? ` (${t.exit.romaji})` : '';
		const tip = `${t.start.name}${fromR} → ${t.exit.name}${toR}`;
		const cur = map.get(label);
		if (cur) cur.count += 1;
		else map.set(label, { count: 1, tip });
	}
	return [...map.entries()]
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, limit)
		.map(([label, { count, tip }]) => ({ label, value: count, tip }));
}

export function categoryBreakdown(trips: NormalizedTrip[]): NamedCount[] {
	const map = new Map<string, number>();
	for (const t of trips) {
		map.set(t.category, (map.get(t.category) ?? 0) + 1);
	}
	return [...map.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([label, value]) => ({ label, value }));
}

export function availableDates(trips: NormalizedTrip[]): string[] {
	return [...new Set(trips.map((t) => t.date))].sort();
}

export function availableMonths(trips: NormalizedTrip[]): string[] {
	return [...new Set(trips.map((t) => t.date.slice(0, 7)))].sort();
}

export function defaultRange(trips: NormalizedTrip[]): ViewRange {
	const dates = availableDates(trips);
	if (dates.length === 0) return { mode: 'all' };
	return { mode: 'day', day: dates[dates.length - 1] };
}

export function shiftDay(dates: string[], current: string, delta: number): string {
	const idx = dates.indexOf(current);
	if (idx < 0) return current;
	const next = Math.min(dates.length - 1, Math.max(0, idx + delta));
	return dates[next];
}

export function shiftMonth(months: string[], current: string, delta: number): string {
	const idx = months.indexOf(current);
	if (idx < 0) return current;
	const next = Math.min(months.length - 1, Math.max(0, idx + delta));
	return months[next];
}

export function mappableLegs(trips: NormalizedTrip[]) {
	return trips.filter(
		(t) =>
			t.start?.known &&
			t.exit?.known &&
			t.start.lat != null &&
			t.start.lng != null &&
			t.exit.lat != null &&
			t.exit.lng != null &&
			(t.category === 'train' || t.category === 'bus')
	);
}

export type Corridor = {
	key: string;
	from: [number, number];
	to: [number, number];
	fromName: string;
	toName: string;
	tip: string;
	count: number;
	dates: string[];
};

export function buildCorridors(trips: NormalizedTrip[]): Corridor[] {
	const map = new Map<string, Corridor>();
	for (const t of mappableLegs(trips)) {
		const a = `${t.start!.lat},${t.start!.lng}`;
		const b = `${t.exit!.lat},${t.exit!.lng}`;
		const ordered = a < b;
		const key = ordered ? `${a}|${b}` : `${b}|${a}`;
		const existing = map.get(key);
		if (existing) {
			existing.count += 1;
			existing.dates.push(t.date);
		} else {
			const from = ordered ? t.start! : t.exit!;
			const to = ordered ? t.exit! : t.start!;
			const fromR = from.romaji ? ` (${from.romaji})` : '';
			const toR = to.romaji ? ` (${to.romaji})` : '';
			map.set(key, {
				key,
				from: [from.lng!, from.lat!],
				to: [to.lng!, to.lat!],
				fromName: from.name,
				toName: to.name,
				tip: `${from.name}${fromR} ↔ ${to.name}${toR}`,
				count: 1,
				dates: [t.date]
			});
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count);
}

export function modeLabel(mode: RangeMode): string {
	if (mode === 'day') return 'Day';
	if (mode === 'month') return 'Month';
	return 'All history';
}
