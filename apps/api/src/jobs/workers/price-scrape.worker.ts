import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { parsePrice } from "@api/lib/parser";
import { extractText, fetchHTML } from "@api/lib/scraper";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redisConnection } from "../connection";

export interface PriceScrapeJobData {
	itemId: string;
}

async function processPriceScrape(itemId: string) {
	// 1. Load item + site + country
	const itemRow = await db.query.item.findFirst({
		where: eq(table.item.id, itemId),
		with: {
			site: {
				with: {
					country: true,
				},
			},
		},
	});

	if (!itemRow || itemRow.deletedAt) {
		console.log(`[price-scrape] Item ${itemId} not found or deleted, skipping`);
		return;
	}

	const { site } = itemRow;
	if (!site) {
		throw new Error(`[price-scrape] Item ${itemId} has no associated site`);
	}

	// 2. Fetch HTML
	const { html, responseTimeMs } = await fetchHTML({
		url: itemRow.url,
		priceCssSelector: site.priceCssSelector,
		nameCssSelector: site.nameCssSelector,
		strategy: site.strategy,
	});

	console.log(
		`[price-scrape] Fetched ${itemRow.url} in ${responseTimeMs}ms (${site.strategy})`,
	);

	// 3. Extract price
	const rawPrice = extractText(html, site.priceCssSelector);
	if (!rawPrice) {
		throw new Error(
			`[price-scrape] No price found for item ${itemId} with selector "${site.priceCssSelector}"`,
		);
	}

	const priceValue = parsePrice(rawPrice);
	if (priceValue === null) {
		throw new Error(
			`[price-scrape] Failed to parse price "${rawPrice}" for item ${itemId}`,
		);
	}

	// 4. Extract and update item name if not yet set
	if (!itemRow.name) {
		const rawName = extractText(html, site.nameCssSelector);
		if (rawName) {
			await db
				.update(table.item)
				.set({ name: rawName })
				.where(eq(table.item.id, itemId));
		}
	}

	// 5. Insert price record
	const currency = site.country.currency;
	await db.insert(table.price).values({
		itemId,
		price: priceValue.toFixed(2),
		currency,
	});

	console.log(
		`[price-scrape] Recorded price ${priceValue} ${currency} for item ${itemId}`,
	);
}

export const priceScrapeWorker = new Worker<PriceScrapeJobData>(
	"price-scrape",
	async (job) => {
		await processPriceScrape(job.data.itemId);
	},
	{
		connection: redisConnection,
		concurrency: 5,
		limiter: {
			max: 10,
			duration: 60_000, // max 10 jobs per minute to be polite to sites
		},
	},
);

priceScrapeWorker.on("completed", (job) => {
	console.log(
		`[price-scrape] Job ${job.id} completed for item ${job.data.itemId}`,
	);
});

priceScrapeWorker.on("failed", (job, err) => {
	console.error(
		`[price-scrape] Job ${job?.id} failed for item ${job?.data.itemId}: ${err.message}`,
	);
});
