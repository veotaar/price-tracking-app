import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Elysia } from "elysia";
import { betterAuth } from "../auth";

const insertCountrySchema = createInsertSchema(table.country).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

const updateCountrySchema = createUpdateSchema(table.country).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const countries = new Elysia({ name: "countries", prefix: "/countries" })
	.use(betterAuth)
	// List all countries
	.get("/", async () => {
		const rows = await db.query.country.findMany({
			where: isNull(table.country.deletedAt),
		});
		return rows;
	})

	// Get one country
	.get("/:id", async ({ params, status }) => {
		const row = await db.query.country.findFirst({
			where: and(
				eq(table.country.id, params.id),
				isNull(table.country.deletedAt),
			),
		});
		if (!row) return status(404);
		return row;
	})

	// Create country (admin only)
	.post(
		"/",
		async ({ body: { name, code, currency } }) => {
			const [row] = await db
				.insert(table.country)
				.values({ name, code, currency })
				.returning();
			return row;
		},
		{
			body: insertCountrySchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Update country (admin only)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const [row] = await db
				.update(table.country)
				.set(body)
				.where(
					and(eq(table.country.id, params.id), isNull(table.country.deletedAt)),
				)
				.returning();

			if (!row) return status(404);
			return row;
		},
		{
			body: updateCountrySchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Soft-delete country (admin only)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const [row] = await db
				.update(table.country)
				.set({ deletedAt: new Date() })
				.where(
					and(eq(table.country.id, params.id), isNull(table.country.deletedAt)),
				)
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
