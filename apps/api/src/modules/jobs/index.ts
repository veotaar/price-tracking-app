import { exchangeRateQueue } from "@api/jobs/queues";
import { Elysia } from "elysia";
import { betterAuth } from "../auth";

export const jobs = new Elysia({ name: "jobs", prefix: "/jobs" })
	.use(betterAuth)
	// Manually trigger the exchange rate job (admin only)
	.post(
		"/exchange-rate/trigger",
		async () => {
			const job = await exchangeRateQueue.add("exchange-rate", {});
			return { jobId: job.id, message: "Exchange rate job queued" };
		},
		{
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	);
