import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Elysia } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";

const insertProductSchema = createInsertSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

const updateProductSchema = createUpdateSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

const addItemSchema = z.object({
	itemId: z.string().min(1),
});

export const products = new Elysia({ name: "products", prefix: "/products" })
	.use(betterAuth)
	// List products with pagination
	.get("/", async ({ query }) => {
		const page = Math.max(1, Number(query.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
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
	})

	// Get one product with its items
	.get("/:id", async ({ params, status }) => {
		const row = await db.query.product.findFirst({
			where: and(
				eq(table.product.id, params.id),
				isNull(table.product.deletedAt),
			),
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
		if (!row) return status(404);
		return row;
	})

	// Create product (user auth required)
	.post(
		"/",
		async ({ body }) => {
			const [row] = await db.insert(table.product).values(body).returning();
			return row;
		},
		{
			body: insertProductSchema,
			auth: true,
		},
	)

	// Update product (user auth required)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const [row] = await db
				.update(table.product)
				.set(body)
				.where(
					and(eq(table.product.id, params.id), isNull(table.product.deletedAt)),
				)
				.returning();
			if (!row) return status(404);
			return row;
		},
		{
			body: updateProductSchema,
			auth: true,
		},
	)

	// Soft-delete product (user auth required)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const [row] = await db
				.update(table.product)
				.set({ deletedAt: new Date() })
				.where(
					and(eq(table.product.id, params.id), isNull(table.product.deletedAt)),
				)
				.returning();
			if (!row) return status(404);
			return { success: true };
		},
		{ auth: true },
	)

	// Link item to product (user auth required)
	.post(
		"/:id/items",
		async ({ params, body: { itemId }, status }) => {
			// Verify product exists
			const product = await db.query.product.findFirst({
				where: and(
					eq(table.product.id, params.id),
					isNull(table.product.deletedAt),
				),
			});
			if (!product) return status(404);

			// Verify item exists
			const item = await db.query.item.findFirst({
				where: and(eq(table.item.id, itemId), isNull(table.item.deletedAt)),
			});
			if (!item) return status(404);

			const [row] = await db
				.insert(table.productItem)
				.values({
					productId: params.id,
					itemId,
				})
				.onConflictDoNothing()
				.returning();

			return row ?? { productId: params.id, itemId };
		},
		{
			body: addItemSchema,
			auth: true,
		},
	)

	// Unlink item from product (user auth required)
	.delete(
		"/:id/items/:itemId",
		async ({ params, status }) => {
			const [row] = await db
				.delete(table.productItem)
				.where(
					and(
						eq(table.productItem.productId, params.id),
						eq(table.productItem.itemId, params.itemId),
					),
				)
				.returning();

			if (!row) return status(404);
			return { success: true };
		},
		{ auth: true },
	);
