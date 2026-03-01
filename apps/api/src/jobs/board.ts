import { readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { Elysia } from "elysia";
import { priceScrapeQueue } from "./queues";

// ---------------------------------------------------------------------------
// Paths – resolve via require.resolve so Bun's module cache is handled
// ---------------------------------------------------------------------------
const bullBoardApiDir = dirname(require.resolve("@bull-board/api"));
const uiPkgPath = require.resolve("@bull-board/ui/package.json");
const uiBasePath = dirname(uiPkgPath);
const distPath = join(uiBasePath, "dist");
const staticPath = join(distPath, "static");

// ---------------------------------------------------------------------------
// Queue registry
// ---------------------------------------------------------------------------
const bullBoardQueues = new Map<string, BullMQAdapter>();
bullBoardQueues.set(priceScrapeQueue.name, new BullMQAdapter(priceScrapeQueue));

// ---------------------------------------------------------------------------
// UI config
// ---------------------------------------------------------------------------
const uiConfig = {
	boardTitle: "Bull Dashboard",
	favIcon: {
		default: "static/images/logo.svg",
		alternative: "static/favicon-32x32.png",
	},
};

// ---------------------------------------------------------------------------
// Pre-render the index HTML from the EJS template (simple string replacement)
// ---------------------------------------------------------------------------
const UI_BASE_PATH = "/api/ui/";
const ejsTemplate = readFileSync(join(distPath, "index.ejs"), "utf-8");
const uiConfigJson = JSON.stringify(uiConfig)
	.replace(/</g, "\\u003c")
	.replace(/>/g, "\\u003e");

const indexHtml = ejsTemplate
	.replace(/<%= basePath %>/g, UI_BASE_PATH)
	.replace(/<%= title %>/g, uiConfig.boardTitle)
	.replace(/<%= favIconDefault %>/g, uiConfig.favIcon.default)
	.replace(/<%= favIconAlternative %>/g, uiConfig.favIcon.alternative)
	.replace(/<%- uiConfig %>/g, uiConfigJson);

// ---------------------------------------------------------------------------
// MIME helpers
// ---------------------------------------------------------------------------
const MIME_TYPES: Record<string, string> = {
	".js": "application/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".json": "application/json",
	".txt": "text/plain",
	".map": "application/json",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
};

function getMimeType(filePath: string): string {
	return MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Import route handlers from @bull-board/api internals
// ---------------------------------------------------------------------------
// biome-ignore lint/suspicious/noExplicitAny: internal bull-board types
type ApiHandler = (req: any) => Promise<{ status?: number; body: any }>;

interface ApiRoute {
	method: string;
	route: string;
	handler: ApiHandler;
}

const { appRoutes } = require(join(bullBoardApiDir, "routes")) as {
	appRoutes: { api: ApiRoute[] };
};

// Build a lookup map  "METHOD /route" → handler
const handlerMap = new Map<string, ApiHandler>();
for (const r of appRoutes.api) {
	const methods = Array.isArray(r.method) ? r.method : [r.method];
	for (const m of methods) {
		handlerMap.set(`${m.toUpperCase()} ${r.route}`, r.handler);
	}
}

/** Call the matching bull-board handler and return a JSON Response */
async function callHandler(
	key: string,
	opts: {
		params?: Record<string, string>;
		body?: unknown;
		query?: Record<string, string>;
	} = {},
) {
	const handler = handlerMap.get(key);
	if (!handler) {
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "content-type": "application/json" },
		});
	}

	const decodedParams = opts.params
		? Object.fromEntries(
				Object.entries(opts.params).map(([k, v]) => [
					k,
					typeof v === "string" ? decodeURIComponent(v) : v,
				]),
			)
		: {};

	const res = await handler({
		queues: bullBoardQueues,
		uiConfig,
		params: decodedParams,
		body: opts.body ?? {},
		query: opts.query ?? {},
		headers: {},
	});

	return new Response(JSON.stringify(res.body), {
		status: res.status ?? 200,
		headers: { "content-type": "application/json" },
	});
}

// ---------------------------------------------------------------------------
// Elysia plugin – no @bull-board/elysia adapter needed
// ---------------------------------------------------------------------------
const htmlResponse = () =>
	new Response(indexHtml, {
		headers: { "content-type": "text/html" },
	});

export const bullBoardPlugin = new Elysia({
	name: "bull-board",
	prefix: "/ui",
})
	// --- SPA entry points ---
	.get("/", () => htmlResponse(), { detail: { hide: true } })
	.get("/queue/:queueName", () => htmlResponse(), { detail: { hide: true } })
	.get("/queue/:queueName/:jobId", () => htmlResponse(), {
		detail: { hide: true },
	})

	// --- Static files ---
	.get(
		"/static/*",
		({ params }) => {
			const wildcard = (params as Record<string, string>)["*"] ?? "";
			const filePath = join(staticPath, wildcard);

			// Security: ensure we stay within staticPath
			if (!resolve(filePath).startsWith(staticPath)) {
				return new Response("Forbidden", { status: 403 });
			}

			return new Response(Bun.file(filePath), {
				headers: { "content-type": getMimeType(filePath) },
			});
		},
		{ detail: { hide: true } },
	)

	// --- Bull Board API: global ---
	.get("/api/redis/stats", () => callHandler("GET /api/redis/stats"), {
		detail: { hide: true },
	})

	.get(
		"/api/queues",
		({ query }) =>
			callHandler("GET /api/queues", {
				query: query as Record<string, string>,
			}),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/pause",
		({ body }) => callHandler("PUT /api/queues/pause", { body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/resume",
		({ body }) => callHandler("PUT /api/queues/resume", { body }),
		{ detail: { hide: true } },
	)

	// --- Bull Board API: per-queue ---
	.post(
		"/api/queues/:queueName/add",
		({ params, body }) =>
			callHandler("POST /api/queues/:queueName/add", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/retry/:queueStatus",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/retry/:queueStatus", {
				params,
				body,
			}),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/promote",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/promote", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/clean/:queueStatus",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/clean/:queueStatus", {
				params,
				body,
			}),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/pause",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/pause", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/resume",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/resume", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/concurrency",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/concurrency", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/empty",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/empty", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/obliterate",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/obliterate", { params, body }),
		{ detail: { hide: true } },
	)

	// --- Bull Board API: per-job ---
	.get(
		"/api/queues/:queueName/:jobId/logs",
		({ params, query }) =>
			callHandler("GET /api/queues/:queueName/:jobId/logs", {
				params,
				query: query as Record<string, string>,
			}),
		{ detail: { hide: true } },
	)

	.get(
		"/api/queues/:queueName/:jobId/flow",
		({ params, query }) =>
			callHandler("GET /api/queues/:queueName/:jobId/flow", {
				params,
				query: query as Record<string, string>,
			}),
		{ detail: { hide: true } },
	)

	.get(
		"/api/queues/:queueName/:jobId",
		({ params, query }) =>
			callHandler("GET /api/queues/:queueName/:jobId", {
				params,
				query: query as Record<string, string>,
			}),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/:jobId/retry",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/:jobId/retry", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/:jobId/clean",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/:jobId/clean", { params, body }),
		{ detail: { hide: true } },
	)

	.put(
		"/api/queues/:queueName/:jobId/promote",
		({ params, body }) =>
			callHandler("PUT /api/queues/:queueName/:jobId/promote", {
				params,
				body,
			}),
		{ detail: { hide: true } },
	)

	.patch(
		"/api/queues/:queueName/:jobId/update-data",
		({ params, body }) =>
			callHandler("PATCH /api/queues/:queueName/:jobId/update-data", {
				params,
				body,
			}),
		{ detail: { hide: true } },
	);
