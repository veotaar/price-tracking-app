import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import * as Sentry from "@sentry/bun";
import { Elysia } from "elysia";
import * as z from "zod";
import env from "./env";
import { products } from "./modules/products";

const app = new Elysia({ prefix: "/api" })
	.use(
		cors({
			origin: [env.FRONTEND_URL, `http://localhost:${env.PORT}`],
			methods: ["GET", "OPTIONS"],
			allowedHeaders: ["Content-Type", "User-Agent"],
		}),
	)
	.use(serverTiming())
	.use(
		openapi({
			references: fromTypes(),
			path: "/openapi",
			mapJsonSchema: {
				zod: z.toJSONSchema,
			},
		}),
	)
	.use(products)
	.get("/health", () => "OK")
	.listen(env.PORT);

if (env.SENTRY_ENABLED && env.SENTRY_DSN) {
	Sentry.init({
		dsn: env.SENTRY_DSN,
		integrations: [
			// send console.log, console.warn, and console.error calls as logs to Sentry
			Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
		],
		enableLogs: true,
	});
}

export type AppPublic = typeof app;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
