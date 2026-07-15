/**
 * Hover title for a station: Japanese name plus romaji when available.
 */
export function stationTitle(station: {
	name: string;
	romaji?: string;
	known?: boolean;
} | null | undefined): string | undefined {
	if (!station?.known) return undefined;
	if (station.romaji) return `${station.name} (${station.romaji})`;
	return station.name;
}

export function routeTitle(
	from: { name: string; romaji?: string; known?: boolean } | null | undefined,
	to: { name: string; romaji?: string; known?: boolean } | null | undefined
): string | undefined {
	const a = stationTitle(from);
	const b = stationTitle(to);
	if (!a && !b) return undefined;
	if (a && b) {
		const fromR = from?.romaji ? ` (${from.romaji})` : '';
		const toR = to?.romaji ? ` (${to.romaji})` : '';
		return `${from!.name}${fromR} → ${to!.name}${toR}`;
	}
	return a ?? b;
}
