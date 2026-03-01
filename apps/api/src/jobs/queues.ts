import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const priceScrapeQueue = new Queue("price-scrape", {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	},
});
