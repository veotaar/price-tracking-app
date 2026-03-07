import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { scheduleItem, unscheduleItem } from "@api/jobs/scheduler";
import { and, eq, ilike, isNull } from "drizzle-orm";
import type { InsertItem } from "./model";

export async function listItems(filters: { siteId?: string; search?: string }) {
	const conditions = [isNull(table.item.deletedAt)];

	if (filters.siteId) {
		conditions.push(eq(table.item.siteId, filters.siteId));
	}
	if (filters.search) {
		conditions.push(ilike(table.item.name, `%${filters.search}%`));
	}

	return db.query.item.findMany({
		where: and(...conditions),
		with: {
			site: {
				with: { country: true },
			},
		},
	});
}

export async function getItem(id: string) {
	return db.query.item.findFirst({
		where: and(eq(table.item.id, id), isNull(table.item.deletedAt)),
		with: { site: { with: { country: true } } },
	});
}

export async function createItem(data: InsertItem) {
	const [row] = await db.insert(table.item).values(data).returning();

	if (row) await scheduleItem(row.id);

	return row;
}

export async function deleteItem(id: string) {
	const [row] = await db
		.update(table.item)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.item.id, id), isNull(table.item.deletedAt)))
		.returning();

	if (row) await unscheduleItem(id);

	return row;
}
