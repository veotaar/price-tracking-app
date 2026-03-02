import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull } from "drizzle-orm";
import type { InsertSite, UpdateSite } from "./model";

export async function listSites(countryId?: string) {
	return db.query.site.findMany({
		where: and(
			isNull(table.site.deletedAt),
			countryId ? eq(table.site.countryId, countryId) : undefined,
		),
		with: { country: true },
	});
}

export async function getSite(id: string) {
	return db.query.site.findFirst({
		where: and(eq(table.site.id, id), isNull(table.site.deletedAt)),
		with: { country: true },
	});
}

export async function createSite(data: InsertSite) {
	const [row] = await db.insert(table.site).values(data).returning();
	return row;
}

export async function updateSite(id: string, data: UpdateSite) {
	const [row] = await db
		.update(table.site)
		.set(data)
		.where(and(eq(table.site.id, id), isNull(table.site.deletedAt)))
		.returning();
	return row;
}

export async function deleteSite(id: string) {
	const [row] = await db
		.update(table.site)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.site.id, id), isNull(table.site.deletedAt)))
		.returning();
	return row;
}
