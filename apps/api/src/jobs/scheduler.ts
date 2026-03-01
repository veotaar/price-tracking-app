import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { isNull } from "drizzle-orm";
import { priceScrapeQueue } from "./queues";

/**
 * Register a repeatable job for one item (1 scrape per hour).
 * Uses upsertJobScheduler so it's safe to call multiple times.
 */
export async function scheduleItem(itemId: string) {
	await priceScrapeQueue.upsertJobScheduler(
		`price-scrape:${itemId}`,
		{ every: 3_600_000 }, // 1 hour in ms
		{
			name: "price-scrape",
			data: { itemId },
		},
	);
}

/**
 * Remove the repeatable job for an item.
 */
export async function unscheduleItem(itemId: string) {
	await priceScrapeQueue.removeJobScheduler(`price-scrape:${itemId}`);
}

/**
 * On app startup, ensure every active (non-deleted) item has a scheduled job.
 */
export async function initScheduler() {
	const items = await db.query.item.findMany({
		where: isNull(table.item.deletedAt),
		columns: { id: true },
	});

	console.log(
		`[scheduler] Initializing ${items.length} price-scrape schedules...`,
	);

	for (const item of items) {
		await scheduleItem(item.id);
	}

	console.log("[scheduler] All schedules registered");
}
