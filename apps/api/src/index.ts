import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import * as z from "zod";
import env from "./env";
import { bullBoardPlugin } from "./jobs/board";
import { initScheduler } from "./jobs/scheduler";
// Side-effect imports: start the worker processes
import "./jobs/workers/price-scrape.worker";
import "./jobs/workers/exchange-rate.worker";
import { OpenAPI } from "./lib/authOpenApi";
import { betterAuthRoutes } from "./modules/auth";
import { countries } from "./modules/countries";
import { items } from "./modules/items";
import { jobs } from "./modules/jobs";
import { products } from "./modules/products";
import { sites } from "./modules/sites";

const app = new Elysia({ prefix: "/api" })
	.use(
		cors({
			origin: [env.BETTER_AUTH_URL, env.FRONTEND_URL],
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
	.use(betterAuthRoutes)
	.use(bullBoardPlugin)
	.use(countries)
	.use(sites)
	.use(items)
	.use(products)
	.use(jobs)
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
