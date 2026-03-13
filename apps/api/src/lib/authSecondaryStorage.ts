import { redisConnection } from "@api/jobs/connection";
import Redis from "ioredis";

const AUTH_REDIS_COMMAND_TIMEOUT_MS = 300;
const AUTH_REDIS_FAILURE_COOLDOWN_MS = 30_000;
const AUTH_REDIS_IDLE_RECONNECT_MS = 15_000;

const authRedis = new Redis({
	...redisConnection,
	commandTimeout: AUTH_REDIS_COMMAND_TIMEOUT_MS,
	connectTimeout: 5_000,
	enableOfflineQueue: true,
	keepAlive: 10_000,
	lazyConnect: false,
	maxRetriesPerRequest: 1,
	socketTimeout: AUTH_REDIS_COMMAND_TIMEOUT_MS,
	retryStrategy: (times) => Math.min(times * 250, 2_000),
});

let bypassRedisUntil = 0;
let lastRedisActivityAt = Date.now();
let reconnectPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function shouldBypassRedis() {
	if (Date.now() < bypassRedisUntil) return true;

	return authRedis.status !== "ready" && authRedis.status !== "connect";
}

async function reconnectRedis(reason: string) {
	if (reconnectPromise) {
		await reconnectPromise;
		return;
	}

	reconnectPromise = (async () => {
		try {
			if (authRedis.status === "ready" || authRedis.status === "connect") {
				authRedis.disconnect(false);
			}

			await authRedis.connect();
			lastRedisActivityAt = Date.now();
			bypassRedisUntil = 0;
		} catch (error) {
			bypassRedisUntil = Date.now() + AUTH_REDIS_FAILURE_COOLDOWN_MS;
			console.error(
				`[auth-redis] reconnect failed after ${reason}: ${getErrorMessage(error)}`,
			);
		} finally {
			reconnectPromise = null;
		}
	})();

	await reconnectPromise;
}

async function ensureRedisConnection() {
	if (Date.now() - lastRedisActivityAt < AUTH_REDIS_IDLE_RECONNECT_MS) return;

	await reconnectRedis("idle period");
}

function logStorageFailure(operation: string, key: string, error: unknown) {
	bypassRedisUntil = Date.now() + AUTH_REDIS_FAILURE_COOLDOWN_MS;

	console.error(
		`[auth-redis] ${operation} failed for ${key}: ${getErrorMessage(error)}`,
	);
}

authRedis.on("ready", () => {
	bypassRedisUntil = 0;
	lastRedisActivityAt = Date.now();
});

authRedis.on("error", (error) => {
	bypassRedisUntil = Date.now() + AUTH_REDIS_FAILURE_COOLDOWN_MS;
	console.error("[auth-redis] client error:", error);
});

export const authSecondaryStorage = {
	async get(key: string) {
		if (shouldBypassRedis()) return null;

		try {
			await ensureRedisConnection();
			const value = await authRedis.get(key);
			lastRedisActivityAt = Date.now();
			return typeof value === "string" ? value : null;
		} catch (error) {
			logStorageFailure("get", key, error);
			return null;
		}
	},
	async set(key: string, value: string, ttl?: number) {
		if (shouldBypassRedis()) return;

		try {
			await ensureRedisConnection();
			if (ttl && ttl > 0) {
				await authRedis.set(key, value, "EX", Math.max(1, Math.ceil(ttl)));
				lastRedisActivityAt = Date.now();
				return;
			}

			await authRedis.set(key, value);
			lastRedisActivityAt = Date.now();
		} catch (error) {
			logStorageFailure("set", key, error);
		}
	},
	async delete(key: string) {
		if (shouldBypassRedis()) return;

		try {
			await ensureRedisConnection();
			await authRedis.del(key);
			lastRedisActivityAt = Date.now();
		} catch (error) {
			logStorageFailure("delete", key, error);
		}
	},
};
