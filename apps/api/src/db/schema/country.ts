import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { currencyEnum } from "./enums";
import { site } from "./site";

export const country = pgTable("country", {
	id: idField,
	name: text("name").notNull().unique(),
	code: text("code").notNull().unique(),
	currency: currencyEnum("currency").notNull(),
	...timestamps,
});

export const countryRelations = relations(country, ({ many }) => ({
	sites: many(site),
}));
