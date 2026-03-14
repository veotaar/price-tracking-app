import {
	invalidateProductListCaches,
	invalidateProductReadCaches,
	runCacheTaskInBackground,
} from "@api/lib/cache";
import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import {
	addItemSchema,
	insertProductSchema,
	productAnalyticsQuerySchema,
	updateProductSchema,
} from "./model";
import {
	createProduct,
	deleteProduct,
	getProduct,
	getProductCurrentPrices,
	getProductPriceHistory,
	linkItemToProduct,
	listProducts,
	unlinkItemFromProduct,
	updateProduct,
} from "./service";

export const products = new Elysia({ name: "products", prefix: "/products" })
	.use(betterAuth)
	// List products with pagination
	.get("/", ({ query }) => {
		const page = Math.max(1, Number(query.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
		return listProducts(page, limit);
	})

	// Get one product with its items
	.get("/:id", async ({ params, status }) => {
		const row = await getProduct(params.id);
		if (!row) return status(404);
		return row;
	})

	// Get price history for a product grouped by country
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

	// Get current prices for a product
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
	)

	// Create product (user auth required)
	.post("/", ({ body }) => createProduct(body), {
		body: insertProductSchema,
		auth: true,
		afterResponse({ responseValue, set }) {
			if (typeof set.status === "number" && set.status >= 400) return;
			if (!responseValue) return;

			runCacheTaskInBackground("products:create", async () => {
				await invalidateProductListCaches();
			});
		},
	})

	// Update product (user auth required)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const row = await updateProduct(params.id, body);
			if (!row) return status(404);
			return row;
		},
		{
			body: updateProductSchema,
			auth: true,
			afterResponse({ params, responseValue, set }) {
				if (typeof set.status === "number" && set.status >= 400) return;
				if (!responseValue) return;

				runCacheTaskInBackground("products:update", async () => {
					await Promise.all([
						invalidateProductListCaches(),
						invalidateProductReadCaches(params.id),
					]);
				});
			},
		},
	)

	// Soft-delete product (user auth required)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const row = await deleteProduct(params.id);
			if (!row) return status(404);
			return { success: true };
		},
		{
			auth: true,
			afterResponse({ params, set }) {
				if (typeof set.status === "number" && set.status >= 400) return;

				runCacheTaskInBackground("products:delete", async () => {
					await Promise.all([
						invalidateProductListCaches(),
						invalidateProductReadCaches(params.id),
					]);
				});
			},
		},
	)

	// Link item to product (user auth required)
	.post(
		"/:id/items",
		async ({ params, body, status }) => {
			const result = await linkItemToProduct(params.id, body);
			if (result === null) return status(404);
			if (result === undefined) return status(404);
			return result;
		},
		{
			body: addItemSchema,
			auth: true,
			afterResponse({ params, responseValue, set }) {
				if (typeof set.status === "number" && set.status >= 400) return;
				if (!responseValue) return;

				runCacheTaskInBackground("products:link-item", async () => {
					await Promise.all([
						invalidateProductListCaches(),
						invalidateProductReadCaches(params.id),
					]);
				});
			},
		},
	)

	// Unlink item from product (user auth required)
	.delete(
		"/:id/items/:itemId",
		async ({ params, status }) => {
			const row = await unlinkItemFromProduct(params.id, params.itemId);
			if (!row) return status(404);
			return { success: true };
		},
		{
			auth: true,
			afterResponse({ params, set }) {
				if (typeof set.status === "number" && set.status >= 400) return;

				runCacheTaskInBackground("products:unlink-item", async () => {
					await Promise.all([
						invalidateProductListCaches(),
						invalidateProductReadCaches(params.id),
					]);
				});
			},
		},
	);
