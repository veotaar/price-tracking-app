import { redisConnection } from "@api/jobs/connection";
import Redis from "ioredis";

const AUTH_REDIS_COMMAND_TIMEOUT_MS = 300;
const AUTH_REDIS_FAILURE_COOLDOWN_MS = 30_000;

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

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function shouldBypassRedis() {
	return Date.now() < bypassRedisUntil;
}

async function ensureRedisConnection() {
	if (
		authRedis.status === "ready" ||
		authRedis.status === "connect" ||
		authRedis.status === "connecting" ||
		authRedis.status === "reconnecting"
	) {
		return;
	}

	try {
		await authRedis.connect();
		bypassRedisUntil = 0;
	} catch (error) {
		bypassRedisUntil = Date.now() + AUTH_REDIS_FAILURE_COOLDOWN_MS;
		console.error(`[auth-redis] connect failed: ${getErrorMessage(error)}`);
	}
}

function logStorageFailure(operation: string, key: string, error: unknown) {
	bypassRedisUntil = Date.now() + AUTH_REDIS_FAILURE_COOLDOWN_MS;

	console.error(
		`[auth-redis] ${operation} failed for ${key}: ${getErrorMessage(error)}`,
	);
}

authRedis.on("ready", () => {
	bypassRedisUntil = 0;
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
				return;
			}

			await authRedis.set(key, value);
		} catch (error) {
			logStorageFailure("set", key, error);
		}
	},
	async delete(key: string) {
		if (shouldBypassRedis()) return;

		try {
			await ensureRedisConnection();
			await authRedis.del(key);
		} catch (error) {
			logStorageFailure("delete", key, error);
		}
	},
};
