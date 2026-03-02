import { table } from "@api/db/model";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";

export const insertSiteSchema = createInsertSchema(table.site).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const updateSiteSchema = createUpdateSchema(table.site).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type UpdateSite = z.infer<typeof updateSiteSchema>;
