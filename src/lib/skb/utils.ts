import type { TripCategory } from './types';

/** Classify Suica process codes into high-level categories. */
export function categorizeTransaction(
	processCode: number,
	hasExit: boolean,
	fare: number
): TripCategory {
	if (processCode === 70) return 'bus';
	if (processCode === 2 || processCode === 3 || processCode === 31) return 'charge';
	if (processCode === 1 || (hasExit && processCode !== 15)) return 'train';
	if (processCode === 15 || processCode === 5 || processCode === 6) return 'purchase';
	if (fare < 0) return 'charge';
	if (hasExit) return 'train';
	return 'other';
}

export function stationKey(
	regionCode: number | undefined,
	lineCode: number | undefined,
	stationCode: number
): string {
	if (lineCode == null || regionCode == null) {
		return `x-${stationCode}`;
	}
	return `${regionCode}-${lineCode}-${stationCode}`;
}

export function formatYen(amount: number): string {
	const sign = amount < 0 ? '-' : '';
	return `${sign}¥${Math.abs(amount).toLocaleString('ja-JP')}`;
}

export function localParts(
	unixMillis: number,
	offsetMillis: number
): { date: string; localIso: string; hasClockTime: boolean; hours: number; minutes: number } {
	const localMs = unixMillis + offsetMillis;
	const d = new Date(localMs);
	// Use UTC getters because we already applied the offset to the instant
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	const hours = d.getUTCHours();
	const minutes = d.getUTCMinutes();
	const seconds = d.getUTCSeconds();
	const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	const localIso = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	const hasClockTime = !(hours === 0 && minutes === 0 && seconds === 0);
	return { date, localIso, hasClockTime, hours, minutes };
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function weekdayIndex(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
