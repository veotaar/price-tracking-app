import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import { insertItemSchema } from "./model";
import { createItem, deleteItem, getItem, listItems } from "./service";

export const items = new Elysia({ name: "items", prefix: "/items" })
	.use(betterAuth)
	// List items with optional filters
	.get("/", ({ query }) => listItems({ siteId: query.siteId as string | undefined, search: query.search as string | undefined }))

	// Get one item
	.get("/:id", async ({ params, status }) => {
		const row = await getItem(params.id);
		if (!row) return status(404);
		return row;
	})

	// Create item (user auth required)
	.post(
		"/",
		({ body }) => createItem(body),
		{
			body: insertItemSchema,
			auth: true,
		},
	)

	// Soft-delete item (user auth required)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const row = await deleteItem(params.id);
			if (!row) return status(404);
			return { success: true };
		},
		{ auth: true },
	);
