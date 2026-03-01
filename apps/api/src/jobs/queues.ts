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

export const exchangeRateQueue = new Queue("exchange-rate", {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 10_000,
		},
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 500 },
	},
});
