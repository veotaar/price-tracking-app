import { table } from "@api/db/model";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";

export const insertCountrySchema = createInsertSchema(table.country).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const updateCountrySchema = createUpdateSchema(table.country).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type UpdateCountry = z.infer<typeof updateCountrySchema>;
