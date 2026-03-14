import { Elysia } from "elysia";
import { productAnalyticsQuerySchema } from "./model";
import {
	getProduct,
	getProductCurrentPrices,
	getProductPriceHistory,
	listProducts,
} from "./service";

export const products = new Elysia({
	name: "public-products",
	prefix: "/products",
})
	.get("/", ({ query }) => {
		const page = Math.max(1, Number(query.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
		return listProducts(page, limit);
	})
	.get("/:id", async ({ params, status }) => {
		const row = await getProduct(params.id);
		if (!row) return status(404);
		return row;
	})
	.get(
		"/:id/history",
		async ({ params, query, status }) => {
			const row = await getProductPriceHistory(params.id, query);
			if (!row) return status(404);
			return row;
		},
		{
			query: productAnalyticsQuerySchema,
		},
	)
	.get(
		"/:id/currentPrices",
		async ({ params, query, status }) => {
			const row = await getProductCurrentPrices(params.id, query);
			if (!row) return status(404);
			return row;
		},
		{
			query: productAnalyticsQuerySchema,
		},
	);
