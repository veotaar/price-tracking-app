import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { cacheKeys, cacheTtl, withCache } from "@api/lib/cache";
import { and, eq, isNull } from "drizzle-orm";
import type { InsertCountry, UpdateCountry } from "./model";

export async function listCountries() {
	return withCache(cacheKeys.countryList(), cacheTtl.countryList, () =>
		db.query.country.findMany({
			where: isNull(table.country.deletedAt),
		}),
	);
}

export async function getCountry(id: string) {
	return withCache(cacheKeys.countryDetail(id), cacheTtl.countryDetail, () =>
		db.query.country.findFirst({
			where: and(eq(table.country.id, id), isNull(table.country.deletedAt)),
		}),
	);
}

export async function createCountry(data: InsertCountry) {
	const [row] = await db.insert(table.country).values(data).returning();
	return row;
}

export async function updateCountry(id: string, data: UpdateCountry) {
	const [row] = await db
		.update(table.country)
		.set(data)
		.where(and(eq(table.country.id, id), isNull(table.country.deletedAt)))
		.returning();
	return row;
}

export async function deleteCountry(id: string) {
	const [row] = await db
		.update(table.country)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.country.id, id), isNull(table.country.deletedAt)))
		.returning();
	return row;
}
