/** Timestamp as stored in Suikakeibo backups */
export type SkbTimestamp = {
	unixMillis: number;
	offsetMillis: number;
};

export type SkbMoney = {
	amount: number;
	currencyCode: string;
};

export type SkbStationCode = {
	stationCode: number;
	lineCode?: number;
	regionCode?: number;
};

export type SkbTransaction = {
	transactionType: string;
	id: string;
	rawDataBase64?: string;
	balance: SkbMoney;
	rawFare: number;
	startedAt: SkbTimestamp;
	startStationCode: SkbStationCode | null;
	exitStationCode: SkbStationCode | null;
	processCode: number;
	consoleCode: number;
	isMissingFare: boolean;
	serialNumber: number;
};

export type SkbRecord = {
	cardId: string;
	createdAt: SkbTimestamp;
	transaction: SkbTransaction;
};

export type SkbCard = {
	id: string;
	type: string;
	createdAt: SkbTimestamp;
	scannedAt?: SkbTimestamp;
	balance?: SkbMoney;
	isRegistered?: boolean;
	title?: string;
	recordCount?: number;
};

export type SkbDatabase = {
	version: number;
	cards: SkbCard[];
	records: SkbRecord[];
	commuterPasses?: unknown[];
	createdAt?: SkbTimestamp;
};

export type TripCategory = 'train' | 'bus' | 'charge' | 'purchase' | 'other';

export type StationInfo = {
	name: string;
	line?: string;
	company?: string;
	lat?: number;
	lng?: number;
	romaji?: string;
};

export type ResolvedStation = {
	key: string;
	name: string;
	romaji?: string;
	line?: string;
	company?: string;
	lat?: number;
	lng?: number;
	/** True when resolved from the Saibane station index (real station name). */
	known: boolean;
};

export type NormalizedTrip = {
	id: string;
	cardId: string;
	serialNumber: number;
	processCode: number;
	consoleCode: number;
	category: TripCategory;
	fare: number;
	balance: number;
	currencyCode: string;
	isMissingFare: boolean;
	/** Local calendar date YYYY-MM-DD */
	date: string;
	/** Local ISO datetime (may be midnight for train date-only records) */
	localIso: string;
	hasClockTime: boolean;
	start: ResolvedStation | null;
	exit: ResolvedStation | null;
	raw: SkbTransaction;
};

export type StationIndex = Record<string, StationInfo>;

export type RangeMode = 'day' | 'month' | 'all';

export type ViewRange = {
	mode: RangeMode;
	/** YYYY-MM-DD when mode is day */
	day?: string;
	/** YYYY-MM when mode is month */
	month?: string;
};
