import { table } from "@api/db/model";
import { currencyEnum } from "@api/db/schema/enums";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

export const insertProductSchema = createInsertSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

export const updateProductSchema = createUpdateSchema(table.product).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});

const normalizationFactorSchema = z.preprocess(
	(value) => {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}

		if (typeof value === "number" && Number.isFinite(value)) {
			return value.toString();
		}

		if (typeof value === "string") {
			return value.trim();
		}

		return value;
	},
	z
		.string()
		.regex(/^\d+(?:\.\d+)?$/)
		.refine((value) => Number(value) > 0, {
			message: "normalizationFactor must be greater than 0",
		})
		.optional(),
);

export const addItemSchema = z.object({
	itemId: z.string().min(1),
	normalizationFactor: normalizationFactorSchema,
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

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type AddItem = z.infer<typeof addItemSchema>;
export type ProductAnalyticsQuery = z.infer<typeof productAnalyticsQuerySchema>;
export type CurrencyCode = ProductAnalyticsQuery["currency"];
