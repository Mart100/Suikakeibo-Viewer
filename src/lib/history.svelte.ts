import { get, set, del } from 'idb-keyval';
import type { NormalizedTrip, SkbCard, SkbDatabase, StationIndex, ViewRange } from './skb/types';
import { normalizeTrips, parseSkbFile, loadStationIndex } from './skb/parse';
import { defaultRange } from './analysis/stats';

const IDB_KEY = 'suikakeibo-last-skb';

export type AppData = {
	db: SkbDatabase;
	trips: NormalizedTrip[];
	cards: SkbCard[];
	fileName: string;
};

class HistoryStore {
	data = $state.raw<AppData | null>(null);
	stations = $state.raw<StationIndex>({});
	range = $state.raw<ViewRange>({ mode: 'all' });
	loading = $state(false);
	error = $state<string | null>(null);
	stationsReady = $state(false);
	restored = $state(false);

	async initStations(base: string) {
		if (this.stationsReady) return;
		try {
			this.stations = await loadStationIndex(base);
			this.stationsReady = true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load stations';
		}
	}

	async loadFile(file: File) {
		this.loading = true;
		this.error = null;
		try {
			const buffer = await file.arrayBuffer();
			const db = await parseSkbFile(buffer);
			const trips = normalizeTrips(db, this.stations);
			this.data = {
				db,
				trips,
				cards: db.cards,
				fileName: file.name
			};
			this.range = defaultRange(trips);
			await set(IDB_KEY, {
				buffer: Array.from(new Uint8Array(buffer)),
				fileName: file.name
			});
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to parse backup';
			this.data = null;
		} finally {
			this.loading = false;
		}
	}

	async restoreFromIdb() {
		if (this.restored) return;
		this.restored = true;
		try {
			const saved = await get<{ buffer: number[]; fileName: string }>(IDB_KEY);
			if (!saved?.buffer?.length) return;
			this.loading = true;
			const bytes = new Uint8Array(saved.buffer);
			const db = await parseSkbFile(bytes.buffer);
			const trips = normalizeTrips(db, this.stations);
			this.data = {
				db,
				trips,
				cards: db.cards,
				fileName: saved.fileName
			};
			this.range = defaultRange(trips);
		} catch {
			await del(IDB_KEY);
		} finally {
			this.loading = false;
		}
	}

	async clear() {
		this.data = null;
		this.range = { mode: 'all' };
		this.error = null;
		await del(IDB_KEY);
	}

	setRange(range: ViewRange) {
		this.range = range;
	}
}

export const history = new HistoryStore();
