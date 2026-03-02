import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import { addItemSchema, insertProductSchema, updateProductSchema } from "./model";
import {
	createProduct,
	deleteProduct,
	getProduct,
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

	// Create product (user auth required)
	.post(
		"/",
		({ body }) => createProduct(body),
		{
			body: insertProductSchema,
			auth: true,
		},
	)

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
		{ auth: true },
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
		{ auth: true },
	);
