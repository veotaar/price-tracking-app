import { beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgres://postgres:postgres@localhost:5432/price_tracking_test";
process.env.BETTER_AUTH_SECRET =
	process.env.BETTER_AUTH_SECRET ?? "test-secret";
process.env.BETTER_AUTH_URL =
	process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
process.env.PORT = process.env.PORT ?? "3000";

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
}

mock.module("ioredis", () => ({
	default: FakeRedis,
}));

const {
	cacheKeys,
	invalidateAllProductAnalyticsCaches,
	invalidateProductListCaches,
	invalidateProductReadCaches,
	withCache,
} = await import("./cache");

function getRedis() {
	const redis = FakeRedis.instances[0];
	if (!redis) {
		throw new Error("Expected cache Redis instance");
	}
	return redis;
}

describe("api cache helper", () => {
	beforeEach(() => {
		getRedis().reset();
	});

	it("returns a cached value without invoking the producer again", async () => {
		let producerCalls = 0;
		const key = cacheKeys.productDetail("product-1");

		await withCache(key, 90, async () => {
			producerCalls += 1;
			return { id: "product-1", source: "db" };
		});

		const second = await withCache(key, 90, async () => {
			producerCalls += 1;
			return { id: "product-1", source: "db-2" };
		});

		expect(second).toEqual({ id: "product-1", source: "db" });
		expect(producerCalls).toBe(1);
	});

	it("invalidates product read caches across both namespaces", async () => {
		const redis = getRedis();
		redis.store.set("pta:api:products:detail:product-1", "detail");
		redis.store.set(
			"pta:api:products:current-prices:product-1:EUR:all",
			"prices",
		);
		redis.store.set(
			"pta:api-public:products:history:product-1:EUR:all:1",
			"history",
		);
		redis.store.set("pta:api:sites:list:all", "sites");

		await invalidateProductReadCaches("product-1");

		expect([...redis.store.keys()]).toEqual(["pta:api:sites:list:all"]);
	});

	it("invalidates list caches for both apps", async () => {
		const redis = getRedis();
		redis.store.set("pta:api:products:list:1:20", "api-list");
		redis.store.set("pta:api-public:products:list:1:20", "public-list");
		redis.store.set("pta:api:products:detail:product-1", "detail");

		await invalidateProductListCaches();

		expect([...redis.store.keys()]).toEqual([
			"pta:api:products:detail:product-1",
		]);
	});

	it("invalidates analytics caches across both apps", async () => {
		const redis = getRedis();
		redis.store.set(
			"pta:api:products:current-prices:product-1:EUR:all",
			"api-current",
		);
		redis.store.set(
			"pta:api-public:products:history:product-1:EUR:all:1",
			"public-history",
		);
		redis.store.set("pta:api:products:detail:product-1", "detail");

		await invalidateAllProductAnalyticsCaches();

		expect([...redis.store.keys()]).toEqual([
			"pta:api:products:detail:product-1",
		]);
	});
});
