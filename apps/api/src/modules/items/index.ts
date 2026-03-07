import { Elysia } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";
import { insertItemSchema } from "./model";
import { createItem, deleteItem, getItem, listItems } from "./service";

export const items = new Elysia({ name: "items", prefix: "/items" })
	.use(betterAuth)
	.guard({ auth: true })
	.onBeforeHandle(({ user, status }) => {
		if (user.role !== "admin") return status(403);
	})
	// List items with optional filters
	.get("/", ({ query: { search, siteId } }) => listItems({ siteId, search }), {
		query: z.object({
			siteId: z.string().optional(),
			search: z.string().optional(),
		}),
	})

	// Get one item
	.get("/:id", async ({ params, status }) => {
		const row = await getItem(params.id);
		if (!row) return status(404);
		return row;
	})

	// Create item (user auth required)
	.post("/", ({ body }) => createItem(body), {
		body: insertItemSchema,
	})

	// Soft-delete item (user auth required)
	.delete("/:id", async ({ params, status }) => {
		const row = await deleteItem(params.id);
		if (!row) return status(404);
		return { success: true };
	});
