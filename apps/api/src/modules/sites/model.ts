import { table } from "@api/db/model";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

const priceDivisorSchema = z
	.number()
	.int()
	.positive("Price divisor must be a positive integer");

export const insertSiteSchema = createInsertSchema(table.site)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
		deletedAt: true,
	})
	.extend({
		priceDivisor: priceDivisorSchema.optional().default(1),
	});

export const updateSiteSchema = createUpdateSchema(table.site)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
		deletedAt: true,
	})
	.extend({
		priceDivisor: priceDivisorSchema.optional(),
	});

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type UpdateSite = z.infer<typeof updateSiteSchema>;
