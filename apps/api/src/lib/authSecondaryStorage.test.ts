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

	disconnect() {
		this.status = "end";
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
	}
}

mock.module("ioredis", () => ({
	default: FakeRedis,
}));

const { authSecondaryStorage } = await import("./authSecondaryStorage");

function getRedis() {
	const redis = FakeRedis.instances[0];
	if (!redis) {
		throw new Error("Expected auth Redis instance");
	}
	return redis;
}

describe("auth secondary storage", () => {
	beforeEach(() => {
		getRedis().reset();
	});

	it("writes ttl values using EX with rounded-up seconds", async () => {
		await authSecondaryStorage.set("session-key", "value", 60.2);

		expect(getRedis().setCalls).toEqual([["session-key", "value", "EX", 61]]);
	});

	it("reads back stored values", async () => {
		getRedis().store.set("session-key", "cached-session");

		const value = await authSecondaryStorage.get("session-key");

		expect(value).toBe("cached-session");
	});

	it("deletes stored values", async () => {
		getRedis().store.set("session-key", "cached-session");

		await authSecondaryStorage.delete("session-key");

		expect(getRedis().store.has("session-key")).toBe(false);
		expect(getRedis().delCalls).toEqual([["session-key"]]);
	});
});
