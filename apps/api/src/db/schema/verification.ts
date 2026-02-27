import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";

export const verification = pgTable(
	"verification",
	{
		id: idField,
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		...timestamps,
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);
