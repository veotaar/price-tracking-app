import { sql } from "drizzle-orm";
import { index, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";
import { currencyEnum } from "./enums";

/**
 * Exchange rates relative to EUR (base currency).
 * Stores how much 1 EUR costs in each foreign currency.
 *
 * Examples:
 *   currency=USD, rate=1.08 → 1 EUR = 1.08 USD
 *   currency=GBP, rate=0.86 → 1 EUR = 0.86 GBP
 *   currency=EUR, rate=1.00 → identity (optional, for uniform queries)
 *
 * To convert a local price to EUR:
 *   price_eur = price_local / rate
 *
 * To convert between any two currencies:
 *   price_target = (price_source / rate_source) * rate_target
 *
 * This table is converted to a TimescaleDB hypertable partitioned by `time`.
 */
export const exchangeRate = pgTable(
	"exchange_rate",
	{
		currency: currencyEnum("currency").notNull(),
		rate: numeric("rate", { precision: 16, scale: 8 }).notNull(),
		time: timestamp("time")
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`),
	},
	(t) => [index("exchange_rate_currency_time_idx").on(t.currency, t.time)],
);
