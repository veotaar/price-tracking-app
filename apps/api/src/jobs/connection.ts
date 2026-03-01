import env from "@api/env";

// Parse REDIS_URL into ioredis-compatible connection options.
function parseRedisUrl(url: string) {
	const parsed = new URL(url);
	return {
		host: parsed.hostname || "localhost",
		port: Number(parsed.port) || 6379,
		password: parsed.password || undefined,
		username: parsed.username || undefined,
		db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
	};
}

export const redisConnection = parseRedisUrl(env.REDIS_URL);
