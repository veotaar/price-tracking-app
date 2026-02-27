import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { user } from "./user";

export const session = pgTable(
	"session",
	{
		id: idField,
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonated_by").references(() => user.id),
		...timestamps,
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));
