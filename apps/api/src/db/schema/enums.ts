import { pgEnum } from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", [
	"EUR", // Eurozone
	"GBP", // United Kingdom
	"SEK", // Sweden
	"NOK", // Norway
	"DKK", // Denmark
	"PLN", // Poland
	"CZK", // Czech Republic
	"HUF", // Hungary
	"RON", // Romania
	"CHF", // Switzerland
	"ISK", // Iceland
	"TRY", // Turkey
	"RSD", // Serbia
	"UAH", // Ukraine
	"GEL", // Georgia
	"AZN", // Azerbaijan
	"MKD", // North Macedonia
	"BAM", // Bosnia and Herzegovina
	"ALL", // Albania
	"USD", // United States
	"CAD", // Canada
	"BRL", // Brazil
	"JPY", // Japan
	"CNY", // China
	"KRW", // South Korea
	"INR", // India
	"SGD", // Singapore
	"HKD", // Hong Kong
	"TWD", // Taiwan
	"THB", // Thailand
	"MYR", // Malaysia
	"IDR", // Indonesia
	"PHP", // Philippines
	"AUD", // Australia
	"NZD", // New Zealand
	"AED", // United Arab Emirates
	"SAR", // Saudi Arabia
	"QAR", // Qatar
	"KWD", // Kuwait
	"ZAR", // South Africa
]);

export const strategyEnum = pgEnum("strategy", ["fetch", "browser"]);
