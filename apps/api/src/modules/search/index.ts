import {
	isTypesenseSearchAvailable,
	searchItems,
	searchSites,
} from "@api/lib/typesense";
import { Elysia } from "elysia";
import { z } from "zod";
import { betterAuth } from "../auth";

export const search = new Elysia({ name: "search", prefix: "/search" })
	.use(betterAuth)
	.guard({ auth: true })
	.onBeforeHandle(({ user, status }) => {
		if (user.role !== "admin") return status(403);
		if (!isTypesenseSearchAvailable()) {
			return status(503, "Typesense search is not configured");
		}
	})
	.get(
		"/items",
		({ query: { q, siteId, perPage } }) =>
			searchItems({ query: q, siteId, perPage }),
		{
			query: z.object({
				q: z.string().optional(),
				siteId: z.string().optional(),
				perPage: z.coerce.number().int().positive().max(250).optional(),
			}),
		},
	)
	.get(
		"/sites",
		({ query: { q, countryId, perPage } }) =>
			searchSites({ query: q, countryId, perPage }),
		{
			query: z.object({
				q: z.string().optional(),
				countryId: z.string().optional(),
				perPage: z.coerce.number().int().positive().max(250).optional(),
			}),
		},
	);
