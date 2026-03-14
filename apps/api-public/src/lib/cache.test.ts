import { beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgres://postgres:postgres@localhost:5432/price_tracking_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5174";
process.env.PORT = process.env.PORT ?? "3001";

type RedisEvent = "ready" | "error";
type RedisHandler = (...args: unknown[]) => void;

class FakeRedis {
	static instances: FakeRedis[] = [];

	status = "wait";
	store = new Map<string, string>();
	setCalls: Array<[string, string, ...(string | number)[]]> = [];
	getCalls: string[] = [];
	delCalls: string[][] = [];
	scanCalls: Array<[string | number, ...(string | number)[]]> = [];
	handlers: Record<RedisEvent, RedisHandler[]> = {
		ready: [],
		error: [],
	};

	constructor(..._args: unknown[]) {
		FakeRedis.instances.push(this);
	}

	on(event: RedisEvent, handler: RedisHandler) {
		this.handlers[event].push(handler);
		return this;
	}

	async connect() {
		this.status = "ready";
		for (const handler of this.handlers.ready) {
			handler();
		}
	}

	async get(key: string) {
		this.getCalls.push(key);
		return this.store.get(key) ?? null;
	}

	async set(key: string, value: string, ...args: (string | number)[]) {
		this.setCalls.push([key, value, ...args]);
		this.store.set(key, value);
		return "OK";
	}

	async scan(cursor: string | number, ...args: (string | number)[]) {
		this.scanCalls.push([cursor, ...args]);
		const patternIndex = args.findIndex((arg) => arg === "MATCH");
		const pattern = patternIndex >= 0 ? String(args[patternIndex + 1]) : "*";
		const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
		const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
		return ["0", keys] as const;
	}

	async del(...keys: string[]) {
		this.delCalls.push(keys);
		for (const key of keys) {
			this.store.delete(key);
		}
		return keys.length;
	}

	reset() {
		this.status = "wait";
		this.store.clear();
		this.setCalls = [];
		this.getCalls = [];
		this.delCalls = [];
		this.scanCalls = [];
	}

	emitError(error: Error) {
		for (const handler of this.handlers.error) {
			handler(error);
		}
	}
}

mock.module("ioredis", () => ({
	default: FakeRedis,
}));

const { cacheKeys, deleteByPrefixes, withCache } = await import("./cache");

function getRedis() {
	const redis = FakeRedis.instances[0];
	if (!redis) {
		throw new Error("Expected cache Redis instance");
	}
	return redis;
}

describe("api-public cache helper", () => {
	beforeEach(() => {
		getRedis().reset();
	});

	it("stores a value on miss and returns the cached value on the second read", async () => {
		let producerCalls = 0;
		const key = cacheKeys.productList(1, 20);

		const first = await withCache(key, 120, async () => {
			producerCalls += 1;
			return { source: "db", value: 1 };
		});

		const second = await withCache(key, 120, async () => {
			producerCalls += 1;
			return { source: "db", value: 2 };
		});

		expect(first).toEqual({ source: "db", value: 1 });
		expect(second).toEqual({ source: "db", value: 1 });
		expect(producerCalls).toBe(1);
		expect(getRedis().setCalls).toEqual([
			[key, JSON.stringify({ source: "db", value: 1 }), "EX", 120],
		]);
	});

	it("deletes all keys matching the provided prefixes", async () => {
		const redis = getRedis();
		redis.store.set("pta:api-public:products:list:1:20", "list");
		redis.store.set("pta:api-public:products:detail:abc", "detail");
		redis.store.set("pta:api-public:sites:list:all", "site-list");

		await deleteByPrefixes([
			"pta:api-public:products:list:",
			"pta:api-public:products:detail:",
		]);

		expect([...redis.store.keys()]).toEqual(["pta:api-public:sites:list:all"]);
		expect(redis.delCalls).toEqual([
			[
				"pta:api-public:products:list:1:20",
				"pta:api-public:products:detail:abc",
			],
		]);
	});

	it("normalizes country lists in history cache keys", () => {
		const key = cacheKeys.productHistory("product-1", {
			currency: "EUR",
			countryCodes: ["PL", "DE", "PL", "AT"],
			includeEuAverage: true,
		});

		expect(key).toBe(
			"pta:api-public:products:history:product-1:EUR:AT,DE,PL:true".replace(
				":true",
				":1",
			),
		);
	});
});
