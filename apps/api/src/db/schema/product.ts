import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { productItem } from "./product-item";

export const product = pgTable("product", {
	id: idField,
	name: text("name").notNull(),
	...timestamps,
});

export const productRelations = relations(product, ({ many }) => ({
	productItems: many(productItem),
}));
