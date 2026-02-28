import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { idField, timestamps } from "../helpers";
import { country } from "./country";
import { strategyEnum } from "./enums";
import { item } from "./item";

export const site = pgTable(
	"site",
	{
		id: idField,
		name: text("name").notNull(),
		hostname: text("hostname").notNull().unique(),
		priceCssSelector: text("price_css_selector").notNull(),
		nameCssSelector: text("name_css_selector").notNull(),
		strategy: strategyEnum("strategy").notNull().default("fetch"),
		countryId: text("country_id")
			.notNull()
			.references(() => country.id),
		...timestamps,
	},
	(t) => [index("site_country_id_idx").on(t.countryId)],
);

export const siteRelations = relations(site, ({ one, many }) => ({
	country: one(country, {
		fields: [site.countryId],
		references: [country.id],
	}),
	items: many(item),
}));
