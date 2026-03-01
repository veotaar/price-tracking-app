import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Elysia } from "elysia";
import { betterAuth } from "../auth";

const insertSiteSchema = createInsertSchema(table.site).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

const updateSiteSchema = createUpdateSchema(table.site).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const sites = new Elysia({ name: "sites", prefix: "/sites" })
	.use(betterAuth)
	// List sites with optional country filter
	.get("/", async ({ query }) => {
		const rows = await db.query.site.findMany({
			where: and(
				isNull(table.site.deletedAt),
				query.countryId
					? eq(table.site.countryId, query.countryId as string)
					: undefined,
			),
			with: { country: true },
		});
		return rows;
	})

	// Get one site
	.get("/:id", async ({ params, status }) => {
		const row = await db.query.site.findFirst({
			where: and(eq(table.site.id, params.id), isNull(table.site.deletedAt)),
			with: { country: true },
		});
		if (!row) return status(404);
		return row;
	})

	// Create site (admin only)
	.post(
		"/",
		async ({ body }) => {
			const [row] = await db.insert(table.site).values(body).returning();
			return row;
		},
		{
			body: insertSiteSchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Update site (admin only)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const [row] = await db
				.update(table.site)
				.set(body)
				.where(and(eq(table.site.id, params.id), isNull(table.site.deletedAt)))
				.returning();

			if (!row) return status(404);
			return row;
		},
		{
			body: updateSiteSchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Soft-delete site (admin only)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const [row] = await db
				.update(table.site)
				.set({ deletedAt: new Date() })
				.where(and(eq(table.site.id, params.id), isNull(table.site.deletedAt)))
				.returning();

			if (!row) return status(404);
			return { success: true };
		},
		{
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	);
