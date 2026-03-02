import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import { insertSiteSchema, updateSiteSchema } from "./model";
import { createSite, deleteSite, getSite, listSites, updateSite } from "./service";

export const sites = new Elysia({ name: "sites", prefix: "/sites" })
	.use(betterAuth)
	// List sites with optional country filter
	.get("/", ({ query }) => listSites(query.countryId as string | undefined))

	// Get one site
	.get("/:id", async ({ params, status }) => {
		const row = await getSite(params.id);
		if (!row) return status(404);
		return row;
	})

	// Create site (admin only)
	.post(
		"/",
		({ body }) => createSite(body),
		{
			body: insertSiteSchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Update site (admin only)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const row = await updateSite(params.id, body);
			if (!row) return status(404);
			return row;
		},
		{
			body: updateSiteSchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Soft-delete site (admin only)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const row = await deleteSite(params.id);
			if (!row) return status(404);
			return { success: true };
		},
		{
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	);
