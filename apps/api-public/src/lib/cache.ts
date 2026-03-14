import env from "@api-public/env";
import type { ProductAnalyticsQuery } from "@api-public/modules/products/model";
import Redis from "ioredis";

const CACHE_PREFIX = "pta:api-public";
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
	retryStrategy: (times: number) => Math.min(times * 250, 2_000),
});

let bypassRedisUntil = 0;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
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
			console.error(
				`[cache:api-public] connect failed: ${getErrorMessage(error)}`,
			);
		}
	}
}

function logCacheFailure(operation: string, key: string, error: unknown) {
	if (!enterFailureCooldown()) {
		return;
	}

	console.error(
		`[cache:api-public] ${operation} failed for ${key}: ${getErrorMessage(error)}`,
	);
}

cacheRedis.on("ready", () => {
	bypassRedisUntil = 0;
});

cacheRedis.on("error", (error: Error) => {
	if (!enterFailureCooldown()) {
		return;
	}

	console.error("[cache:api-public] client error:", error);
});

function normalizeCountryCodes(
	countryCodes: ProductAnalyticsQuery["countryCodes"],
) {
	if (!countryCodes?.length) {
		return "all";
	}

	return [...new Set(countryCodes)].sort().join(",");
}

export const cacheTtl = {
	productList: 300,
	productDetail: 900,
	productCurrentPrices: 120,
	productHistory: 300,
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

export async function deleteByPrefixes(prefixes: string[]) {
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
