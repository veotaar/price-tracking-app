import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import * as z from "zod";
import env from "./env";
import { OpenAPI } from "./lib/authOpenApi";
import { betterAuth } from "./modules/auth";

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
	.get("/health", () => "OK")
	.listen(env.PORT);

export type App = typeof app;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
