import { Elysia } from "elysia";
import { betterAuth } from "../auth";
import { insertCountrySchema, updateCountrySchema } from "./model";
import {
	createCountry,
	deleteCountry,
	getCountry,
	listCountries,
	updateCountry,
} from "./service";

export const countries = new Elysia({ name: "countries", prefix: "/countries" })
	.use(betterAuth)
	// List all countries
	.get("/", () => listCountries())

	// Get one country
	.get("/:id", async ({ params, status }) => {
		const row = await getCountry(params.id);
		if (!row) return status(404);
		return row;
	})

	// Create country (admin only)
	.post(
		"/",
		({ body }) => createCountry(body),
		{
			body: insertCountrySchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Update country (admin only)
	.put(
		"/:id",
		async ({ params, body, status }) => {
			const row = await updateCountry(params.id, body);
			if (!row) return status(404);
			return row;
		},
		{
			body: updateCountrySchema,
			auth: true,
			async beforeHandle({ user, status }) {
				if (user.role !== "admin") return status(403);
			},
		},
	)

	// Soft-delete country (admin only)
	.delete(
		"/:id",
		async ({ params, status }) => {
			const row = await deleteCountry(params.id);
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
