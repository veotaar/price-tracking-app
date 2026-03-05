import { Elysia } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";
import { insertSiteSchema, updateSiteSchema } from "./model";
import {
	createSite,
	deleteSite,
	getSite,
	listSites,
	updateSite,
} from "./service";

export const sites = new Elysia({ name: "sites", prefix: "/sites" })
	.use(betterAuth)
	.guard({ auth: true })
	.onBeforeHandle(({ user, status }) => {
		if (user.role !== "admin") return status(403);
	})
	// List sites with optional country filter
	.get("/", ({ query: { countryId } }) => listSites(countryId), {
		query: z.object({
			countryId: z.string().optional(),
		}),
	})

	// Get one site
	.get("/:id", async ({ params, status }) => {
		const row = await getSite(params.id);
		if (!row) return status(404);
		return row;
	})

	// Create site
	.post("/", ({ body }) => createSite(body), {
		body: insertSiteSchema,
	})

	// Update site
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const row = await updateSite(params.id, body);
			if (!row) return status(404);
			return row;
		},
		{
			body: updateSiteSchema,
		},
	)

	// Soft-delete site
	.delete("/:id", async ({ params, status }) => {
		const row = await deleteSite(params.id);
		if (!row) return status(404);
		return { success: true };
	});
