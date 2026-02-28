import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { price } from "./price";
import { productItem } from "./product-item";
import { site } from "./site";

export const item = pgTable(
	"item",
	{
		id: idField,
		siteId: text("site_id")
			.notNull()
			.references(() => site.id),
		url: text("url").notNull().unique(),
		name: text("name"),
		...timestamps,
	},
	(t) => [index("item_site_id_idx").on(t.siteId)],
);

export const itemRelations = relations(item, ({ one, many }) => ({
	site: one(site, {
		fields: [item.siteId],
		references: [site.id],
	}),
	productItems: many(productItem),
	prices: many(price),
}));
