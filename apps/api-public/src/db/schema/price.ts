import { relations, sql } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { currencyEnum } from "./enums";
import { item } from "./item";

export const price = pgTable(
	"price",
	{
		itemId: text("item_id")
			.notNull()
			.references(() => item.id, { onDelete: "cascade" }),
		price: numeric("price", { precision: 12, scale: 2 }).notNull(),
		currency: currencyEnum("currency").notNull(),
		time: timestamp("time")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`),
	},
	(table) => [index("price_item_id_time_idx").on(table.itemId, table.time)],
);

export const priceRelations = relations(price, ({ one }) => ({
	item: one(item, {
		fields: [price.itemId],
		references: [item.id],
	}),
}));
