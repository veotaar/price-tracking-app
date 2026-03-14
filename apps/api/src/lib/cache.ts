import env from "@api/env";
import type { ProductAnalyticsQuery } from "@api/modules/products/model";
import Redis from "ioredis";

const CACHE_PREFIX = "pta:api";
const PUBLIC_CACHE_PREFIX = "pta:api-public";
const CACHE_COMMAND_TIMEOUT_MS = 300;
const CACHE_FAILURE_COOLDOWN_MS = 30_000;
const CACHE_SCAN_COUNT = 100;

const cacheRedis = new Redis(env.REDIS_URL, {
	commandTimeout: CACHE_COMMAND_TIMEOUT_MS,
	connectTimeout: 5_000,
	enableOfflineQueue: false,
	keepAlive: 10_000,
	lazyConnect: false,
	maxRetriesPerRequest: 1,
	socketTimeout: CACHE_COMMAND_TIMEOUT_MS,
	retryStrategy: (times) => Math.min(times * 250, 2_000),
});

let bypassRedisUntil = 0;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

export function runCacheTaskInBackground(
	label: string,
	task: () => Promise<void>,
) {
	queueMicrotask(() => {
		void task().catch((error) => {
			console.error(
				`[cache:api] background task failed for ${label}: ${getErrorMessage(error)}`,
			);
		});
	});
}

function enterFailureCooldown() {
	const now = Date.now();
	const shouldLog = now >= bypassRedisUntil;
	bypassRedisUntil = now + CACHE_FAILURE_COOLDOWN_MS;
	return shouldLog;
}

function shouldBypassRedis() {
	return Date.now() < bypassRedisUntil;
}

async function ensureRedisConnection() {
	if (
		cacheRedis.status === "ready" ||
		cacheRedis.status === "connect" ||
		cacheRedis.status === "connecting" ||
		cacheRedis.status === "reconnecting"
	) {
		return;
	}

	try {
		await cacheRedis.connect();
		bypassRedisUntil = 0;
	} catch (error) {
		if (enterFailureCooldown()) {
			console.error(`[cache:api] connect failed: ${getErrorMessage(error)}`);
		}
	}
}

function logCacheFailure(operation: string, key: string, error: unknown) {
	if (!enterFailureCooldown()) {
		return;
	}

	console.error(
		`[cache:api] ${operation} failed for ${key}: ${getErrorMessage(error)}`,
	);
}

cacheRedis.on("ready", () => {
	bypassRedisUntil = 0;
});

cacheRedis.on("error", (error) => {
	if (!enterFailureCooldown()) {
		return;
	}

	console.error("[cache:api] client error:", error);
});

function normalizeCountryCodes(
	countryCodes: ProductAnalyticsQuery["countryCodes"],
) {
	if (!countryCodes?.length) {
		return "all";
	}

	return [...new Set(countryCodes)].sort().join(",");
}

function normalizeSearch(search?: string) {
	const trimmed = search?.trim().toLowerCase();
	return trimmed ? encodeURIComponent(trimmed) : "all";
}

export const cacheTtl = {
	productList: 300,
	productDetail: 900,
	productCurrentPrices: 120,
	productHistory: 300,
	itemList: 300,
	itemDetail: 300,
	siteList: 900,
	siteDetail: 900,
	countryList: 3600,
	countryDetail: 3600,
} as const;

export const cacheKeys = {
	productList(page: number, limit: number) {
		return `${CACHE_PREFIX}:products:list:${page}:${limit}`;
	},
	productDetail(productId: string) {
		return `${CACHE_PREFIX}:products:detail:${productId}`;
	},
	productCurrentPrices(
		productId: string,
		{
			currency,
			countryCodes,
		}: Pick<ProductAnalyticsQuery, "currency" | "countryCodes">,
	) {
		return `${CACHE_PREFIX}:products:current-prices:${productId}:${currency}:${normalizeCountryCodes(countryCodes)}`;
	},
	productHistory(
		productId: string,
		{ currency, countryCodes, includeEuAverage }: ProductAnalyticsQuery,
	) {
		return `${CACHE_PREFIX}:products:history:${productId}:${currency}:${normalizeCountryCodes(countryCodes)}:${includeEuAverage ? "1" : "0"}`;
	},
	itemList(siteId?: string, search?: string) {
		return `${CACHE_PREFIX}:items:list:${siteId ?? "all"}:${normalizeSearch(search)}`;
	},
	itemDetail(itemId: string) {
		return `${CACHE_PREFIX}:items:detail:${itemId}`;
	},
	siteList(countryId?: string) {
		return `${CACHE_PREFIX}:sites:list:${countryId ?? "all"}`;
	},
	siteDetail(siteId: string) {
		return `${CACHE_PREFIX}:sites:detail:${siteId}`;
	},
	countryList() {
		return `${CACHE_PREFIX}:countries:list`;
	},
	countryDetail(countryId: string) {
		return `${CACHE_PREFIX}:countries:detail:${countryId}`;
	},
};

export async function withCache<T>(
	key: string,
	ttlSeconds: number,
	producer: () => Promise<T>,
) {
	if (!shouldBypassRedis()) {
		try {
			await ensureRedisConnection();
			const cached = await cacheRedis.get(key);
			if (cached !== null) {
				return JSON.parse(cached) as T;
			}
		} catch (error) {
			logCacheFailure("get", key, error);
		}
	}

	const value = await producer();

	if (value !== null && value !== undefined && !shouldBypassRedis()) {
		try {
			await ensureRedisConnection();
			await cacheRedis.set(key, JSON.stringify(value), "EX", ttlSeconds);
		} catch (error) {
			logCacheFailure("set", key, error);
		}
	}

	return value;
}

async function deleteByPrefixes(prefixes: string[]) {
	if (shouldBypassRedis() || prefixes.length === 0) {
		return;
	}

	try {
		await ensureRedisConnection();

		const keys = new Set<string>();

		for (const prefix of prefixes) {
			let cursor = "0";

			do {
				const [nextCursor, batch] = await cacheRedis.scan(
					cursor,
					"MATCH",
					`${prefix}*`,
					"COUNT",
					CACHE_SCAN_COUNT,
				);

				for (const key of batch) {
					keys.add(key);
				}

				cursor = nextCursor;
			} while (cursor !== "0");
		}

		if (keys.size > 0) {
			await cacheRedis.del(...keys);
		}
	} catch (error) {
		logCacheFailure("delete-prefix", prefixes.join(","), error);
	}
}

function sharedProductPrefixes(productId: string) {
	return [
		`${CACHE_PREFIX}:products:detail:${productId}`,
		`${CACHE_PREFIX}:products:current-prices:${productId}:`,
		`${CACHE_PREFIX}:products:history:${productId}:`,
		`${PUBLIC_CACHE_PREFIX}:products:detail:${productId}`,
		`${PUBLIC_CACHE_PREFIX}:products:current-prices:${productId}:`,
		`${PUBLIC_CACHE_PREFIX}:products:history:${productId}:`,
	];
}

export async function invalidateProductListCaches() {
	await deleteByPrefixes([
		`${CACHE_PREFIX}:products:list:`,
		`${PUBLIC_CACHE_PREFIX}:products:list:`,
	]);
}

export async function invalidateProductReadCaches(productId: string) {
	await deleteByPrefixes(sharedProductPrefixes(productId));
}

export async function invalidateAllProductCaches() {
	await deleteByPrefixes([
		`${CACHE_PREFIX}:products:`,
		`${PUBLIC_CACHE_PREFIX}:products:`,
	]);
}

export async function invalidateAllProductAnalyticsCaches() {
	await deleteByPrefixes([
		`${CACHE_PREFIX}:products:current-prices:`,
		`${CACHE_PREFIX}:products:history:`,
		`${PUBLIC_CACHE_PREFIX}:products:current-prices:`,
		`${PUBLIC_CACHE_PREFIX}:products:history:`,
	]);
}

export async function invalidateItemCaches(itemId?: string) {
	const prefixes = [`${CACHE_PREFIX}:items:list:`];

	if (itemId) {
		prefixes.push(`${CACHE_PREFIX}:items:detail:${itemId}`);
	}

	await deleteByPrefixes(prefixes);
}

export async function invalidateSiteCaches(siteId?: string) {
	const prefixes = [`${CACHE_PREFIX}:sites:list:`];

	if (siteId) {
		prefixes.push(`${CACHE_PREFIX}:sites:detail:${siteId}`);
	}

	await deleteByPrefixes(prefixes);
}

export async function invalidateCountryCaches(countryId?: string) {
	const prefixes = [`${CACHE_PREFIX}:countries:list`];

	if (countryId) {
		prefixes.push(`${CACHE_PREFIX}:countries:detail:${countryId}`);
	}

	await deleteByPrefixes(prefixes);
}
