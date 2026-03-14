import { sql } from "drizzle-orm";
import { index, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";
import { currencyEnum } from "./enums";

export const exchangeRate = pgTable(
	"exchange_rate",
	{
		currency: currencyEnum("currency").notNull(),
		rate: numeric("rate", { precision: 16, scale: 8 }).notNull(),
		time: timestamp("time")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`),
	},
	(table) => [
		index("exchange_rate_currency_time_idx").on(table.currency, table.time),
	],
);
