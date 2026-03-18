import { scheduleItem, unscheduleItem } from "@api/jobs/scheduler";
import {
	invalidateAllProductCaches,
	invalidateItemCaches,
	runCacheTaskInBackground,
} from "@api/lib/cache";
import { deleteItemDocument, syncItemDocument } from "@api/lib/typesense";
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
		afterResponse({ responseValue, set }) {
			if (typeof set.status === "number" && set.status >= 400) return;
			if (!responseValue || typeof responseValue !== "object") return;

			const itemId = "id" in responseValue ? responseValue.id : undefined;
			if (typeof itemId !== "string") return;

			runCacheTaskInBackground("items:create", async () => {
				await Promise.all([
					scheduleItem(itemId),
					invalidateItemCaches(),
					syncItemDocument(itemId),
				]);
			});
		},
	})

	// Soft-delete item (user auth required)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const row = await deleteItem(params.id);
			if (!row) return status(404);
			return { success: true };
		},
		{
			afterResponse({ params, set }) {
				if (typeof set.status === "number" && set.status >= 400) return;

				runCacheTaskInBackground("items:delete", async () => {
					await Promise.all([
						unscheduleItem(params.id),
						invalidateItemCaches(params.id),
						invalidateAllProductCaches(),
						deleteItemDocument(params.id),
					]);
				});
			},
		},
	);
