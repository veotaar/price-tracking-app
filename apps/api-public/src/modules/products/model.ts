import { table } from "@api-public/db/model";
import { currencyEnum } from "@api-public/db/schema/enums";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const productSummarySchema = createSelectSchema(table.product, {
	name: z.string().min(1),
});

const countryCodesSchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	const values = Array.isArray(value) ? value : [value];

	return values
		.flatMap((entry) => (typeof entry === "string" ? entry.split(",") : []))
		.map((entry) => entry.trim().toUpperCase())
		.filter(Boolean);
}, z.array(z.string().length(2)).optional());

const booleanQuerySchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().toLowerCase();

		if (normalizedValue === "true") {
			return true;
		}

		if (normalizedValue === "false") {
			return false;
		}
	}

	return value;
}, z.boolean().optional());

export const productAnalyticsQuerySchema = z.object({
	currency: z
		.preprocess(
			(value) => (typeof value === "string" ? value.toUpperCase() : value),
			z.enum(currencyEnum.enumValues),
		)
		.default("EUR"),
	countryCodes: countryCodesSchema,
	includeEuAverage: booleanQuerySchema.default(false),
});

export type ProductAnalyticsQuery = z.infer<typeof productAnalyticsQuerySchema>;
export type CurrencyCode = ProductAnalyticsQuery["currency"];
