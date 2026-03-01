import { pgEnum } from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", [
	"EUR", // Eurozone
	"GBP", // United Kingdom
	"SEK", // Sweden
	"NOK", // Norway
	"PLN", // Poland
	"TRY", // Turkey
	"CZK", // Czechia
	"CHF", // Switzerland
	"DKK", // Denmark
	"HUF", // Hungary
	"RON", // Romania
	"AED", // UAE
	"QAR", // Qatar
	"KWD", // Kuwait
	"SGD", // Singapore
	"JPY", // Japan
	"KRW", // South Korea
	"INR", // India
	"MYR", // Malaysia
	"THB", // Thailand
	"PHP", // Philippines
	"HKD", // Hong Kong
	"TWD", // Taiwan
	"AUD", // Australia
	"NZD", // New Zealand
	"USD", // USA
	"CAD", // Canada
	"MXN", // Mexico
	"BRL", // Brazil
	"ARS", // Argentina
	"CLP", // Chile
	"COP", // Colombia
]);

export const strategyEnum = pgEnum("strategy", ["fetch", "browser"]);
