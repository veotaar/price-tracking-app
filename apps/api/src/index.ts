import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import * as z from "zod";
import env from "./env";
import { bullBoardPlugin } from "./jobs/board";
import { initScheduler } from "./jobs/scheduler";
// Side-effect import: starts the worker process
import "./jobs/workers/price-scrape.worker";
import { OpenAPI } from "./lib/authOpenApi";
import { betterAuth } from "./modules/auth";
import { countries } from "./modules/countries";
import { items } from "./modules/items";
import { products } from "./modules/products";
import { sites } from "./modules/sites";

const app = new Elysia({ prefix: "/api" })
	.use(
		cors({
			origin: "http://localhost:3001",
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
			credentials: true,
			allowedHeaders: ["Content-Type", "Authorization", "User-Agent"],
		}),
	)
	.use(serverTiming())
	.use(
		openapi({
			references: fromTypes(),
			documentation: {
				components: await OpenAPI.components,
				paths: await OpenAPI.getPaths(),
			},
			path: "/openapi",
			mapJsonSchema: {
				zod: z.toJSONSchema,
			},
		}),
	)
	.use(betterAuth)
	.use(bullBoardPlugin)
	.use(countries)
	.use(sites)
	.use(items)
	.use(products)
	.get("/health", () => "OK")
	.listen(env.PORT);

// Initialize job schedulers for existing items
initScheduler().catch((err) =>
	console.error("[scheduler] Failed to initialize:", err),
);

export type App = typeof app;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
