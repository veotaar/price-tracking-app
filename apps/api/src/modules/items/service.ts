import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { cacheKeys, cacheTtl, withCache } from "@api/lib/cache";
import { and, eq, ilike, isNull } from "drizzle-orm";
import type { InsertItem } from "./model";

export async function listItems(filters: { siteId?: string; search?: string }) {
	return withCache(
		cacheKeys.itemList(filters.siteId, filters.search),
		cacheTtl.itemList,
		async () => {
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
		},
	);
}

export async function getItem(id: string) {
	return withCache(cacheKeys.itemDetail(id), cacheTtl.itemDetail, () =>
		db.query.item.findFirst({
			where: and(eq(table.item.id, id), isNull(table.item.deletedAt)),
			with: { site: { with: { country: true } } },
		}),
	);
}

export async function createItem(data: InsertItem) {
	const [row] = await db.insert(table.item).values(data).returning();
	return row;
}

export async function deleteItem(id: string) {
	const [row] = await db
		.update(table.item)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.item.id, id), isNull(table.item.deletedAt)))
		.returning();
	return row;
}
