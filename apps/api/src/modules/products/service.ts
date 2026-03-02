import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { AddItem, InsertProduct, UpdateProduct } from "./model";

export async function listProducts(page: number, limit: number) {
	const offset = (page - 1) * limit;

	const rows = await db.query.product.findMany({
		where: isNull(table.product.deletedAt),
		limit,
		offset,
		with: {
			productItems: {
				with: { item: true },
			},
		},
	});

	const countResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(table.product)
		.where(isNull(table.product.deletedAt));
	const count = countResult[0]?.count ?? 0;

	return {
		data: rows,
		pagination: {
			page,
			limit,
			total: count,
			totalPages: Math.ceil(count / limit),
		},
	};
}

export async function getProduct(id: string) {
	return db.query.product.findFirst({
		where: and(eq(table.product.id, id), isNull(table.product.deletedAt)),
		with: {
			productItems: {
				with: {
					item: {
						with: { site: { with: { country: true } } },
					},
				},
			},
		},
	});
}

export async function createProduct(data: InsertProduct) {
	const [row] = await db.insert(table.product).values(data).returning();
	return row;
}

export async function updateProduct(id: string, data: UpdateProduct) {
	const [row] = await db
		.update(table.product)
		.set(data)
		.where(and(eq(table.product.id, id), isNull(table.product.deletedAt)))
		.returning();
	return row;
}

export async function deleteProduct(id: string) {
	const [row] = await db
		.update(table.product)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.product.id, id), isNull(table.product.deletedAt)))
		.returning();
	return row;
}

export async function linkItemToProduct(
	productId: string,
	{ itemId }: AddItem,
) {
	const product = await db.query.product.findFirst({
		where: and(
			eq(table.product.id, productId),
			isNull(table.product.deletedAt),
		),
	});
	if (!product) return null;

	const item = await db.query.item.findFirst({
		where: and(eq(table.item.id, itemId), isNull(table.item.deletedAt)),
	});
	if (!item) return undefined;

	const [row] = await db
		.insert(table.productItem)
		.values({ productId, itemId })
		.onConflictDoNothing()
		.returning();

	return row ?? { productId, itemId };
}

export async function unlinkItemFromProduct(
	productId: string,
	itemId: string,
) {
	const [row] = await db
		.delete(table.productItem)
		.where(
			and(
				eq(table.productItem.productId, productId),
				eq(table.productItem.itemId, itemId),
			),
		)
		.returning();
	return row;
}
