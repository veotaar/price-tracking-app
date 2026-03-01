import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { scheduleItem, unscheduleItem } from "@api/jobs/scheduler";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { Elysia } from "elysia";
import { betterAuth } from "../auth";

const insertItemSchema = createInsertSchema(table.item).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const items = new Elysia({ name: "items", prefix: "/items" })
	.use(betterAuth)
	// List items with optional filters
	.get("/", async ({ query }) => {
		const conditions = [isNull(table.item.deletedAt)];

		if (query.siteId) {
			conditions.push(eq(table.item.siteId, query.siteId as string));
		}
		if (query.search) {
			conditions.push(ilike(table.item.name, `%${query.search}%`));
		}

		const rows = await db.query.item.findMany({
			where: and(...conditions),
			with: { site: true },
		});
		return rows;
	})

	// Get one item
	.get("/:id", async ({ params, status }) => {
		const row = await db.query.item.findFirst({
			where: and(eq(table.item.id, params.id), isNull(table.item.deletedAt)),
			with: { site: { with: { country: true } } },
		});
		if (!row) return status(404);
		return row;
	})

	// Create item (user auth required)
	.post(
		"/",
		async ({ body }) => {
			const rows = await db.insert(table.item).values(body).returning();

			const row = rows[0];

			// Schedule hourly price scrape for this item
			if (row) await scheduleItem(row.id);

			return row;
		},
		{
			body: insertItemSchema,
			auth: true,
		},
	)

	// Soft-delete item (user auth required)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const [row] = await db
				.update(table.item)
				.set({ deletedAt: new Date() })
				.where(and(eq(table.item.id, params.id), isNull(table.item.deletedAt)))
				.returning();

			if (!row) return status(404);

			// Remove the scheduled job
			await unscheduleItem(params.id);

			return { success: true };
		},
		{ auth: true },
	);
