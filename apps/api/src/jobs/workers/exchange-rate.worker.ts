import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { currencyEnum } from "@api/db/schema/enums";
import { Worker } from "bullmq";
import { redisConnection } from "../connection";

const PRIMARY_URL =
	"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";
const FALLBACK_URL =
	"https://latest.currency-api.pages.dev/v1/currencies/eur.json";

/** The set of currency codes we care about (uppercase). */
const SUPPORTED_CURRENCIES = new Set(currencyEnum.enumValues);

interface ApiResponse {
	date: string;
	eur: Record<string, number>;
}

async function fetchWithFallback(): Promise<ApiResponse> {
	try {
		const res = await fetch(PRIMARY_URL);
		if (!res.ok) throw new Error(`Primary API returned ${res.status}`);
		return (await res.json()) as ApiResponse;
	} catch (err) {
		console.warn(
			"[exchange-rate] Primary API failed, trying fallback:",
			err instanceof Error ? err.message : err,
		);
		const res = await fetch(FALLBACK_URL);
		if (!res.ok) throw new Error(`Fallback API also returned ${res.status}`);
		return (await res.json()) as ApiResponse;
	}
}

async function processExchangeRate() {
	const data = await fetchWithFallback();

	const rows: {
		currency: (typeof currencyEnum.enumValues)[number];
		rate: string;
		time: Date;
	}[] = [];
	const now = new Date();

	for (const [code, rate] of Object.entries(data.eur)) {
		const upper = code.toUpperCase();
		if (
			SUPPORTED_CURRENCIES.has(
				upper as (typeof currencyEnum.enumValues)[number],
			)
		) {
			rows.push({
				currency: upper as (typeof currencyEnum.enumValues)[number],
				rate: rate.toString(),
				time: now,
			});
		}
	}

	if (rows.length === 0) {
		throw new Error(
			"[exchange-rate] No matching currencies found in API response",
		);
	}

	await db.insert(table.exchangeRate).values(rows);

	console.log(
		`[exchange-rate] Inserted ${rows.length} exchange rates (date: ${data.date})`,
	);
}

export const exchangeRateWorker = new Worker(
	"exchange-rate",
	async () => {
		await processExchangeRate();
	},
	{
		connection: redisConnection,
		concurrency: 1,
	},
);
