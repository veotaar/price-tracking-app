import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import { triggerExchangeRateJob } from "./service";

export const jobs = new Elysia({ name: "jobs", prefix: "/jobs" })
	.use(betterAuth)
	// Manually trigger the exchange rate job (admin only)
	.post(
		"/exchange-rate/trigger",
		() => triggerExchangeRateJob(),
		{
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	);
