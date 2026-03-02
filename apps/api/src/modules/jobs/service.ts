import { exchangeRateQueue } from "@api/jobs/queues";

export async function triggerExchangeRateJob() {
	const job = await exchangeRateQueue.add("exchange-rate", {});
	return { jobId: job.id, message: "Exchange rate job queued" };
}
