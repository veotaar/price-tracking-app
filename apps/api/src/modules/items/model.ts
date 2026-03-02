import { table } from "@api/db/model";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";

export const insertItemSchema = createInsertSchema(table.item).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export type InsertItem = z.infer<typeof insertItemSchema>;
