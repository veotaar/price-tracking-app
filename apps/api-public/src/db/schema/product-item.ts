import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, unique } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { item } from "./item";
import { product } from "./product";

export const productItem = pgTable(
	"product_item",
	{
		id: idField,
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		itemId: text("item_id")
			.notNull()
			.references(() => item.id, { onDelete: "cascade" }),
		normalizationFactor: numeric("normalization_factor", {
			precision: 12,
			scale: 6,
		})
			.notNull()
			.default("1"),
		...timestamps,
	},
	(table) => [
		unique("product_item_product_id_item_id_unique").on(
			table.productId,
			table.itemId,
		),
		index("product_item_product_id_idx").on(table.productId),
		index("product_item_item_id_idx").on(table.itemId),
	],
);

export const productItemRelations = relations(productItem, ({ one }) => ({
	product: one(product, {
		fields: [productItem.productId],
		references: [product.id],
	}),
	item: one(item, {
		fields: [productItem.itemId],
		references: [item.id],
	}),
}));
