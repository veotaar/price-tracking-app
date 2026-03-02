import { table } from "@api/db/model";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

export const insertProductSchema = createInsertSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const updateProductSchema = createUpdateSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const addItemSchema = z.object({
	itemId: z.string().min(1),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type AddItem = z.infer<typeof addItemSchema>;
