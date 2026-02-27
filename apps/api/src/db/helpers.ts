import { sql } from "drizzle-orm";
import { text, timestamp } from "drizzle-orm/pg-core";

export const idField = text("id").default(sql`uuidv7()`).primaryKey();

export const timestamps = {
	createdAt: timestamp("created_at")
		.default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`)
		.notNull(),
	updatedAt: timestamp("updated_at")
		.default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`)
		.$onUpdateFn(() => sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`)
		.notNull(),
	deletedAt: timestamp("deleted_at"),
};
