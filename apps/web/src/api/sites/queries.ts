import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type SitesResponse = Treaty.Data<typeof client.api.sites.get>;

export async function getSites() {
	const response = await client.api.sites.get();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function sitesOptions() {
	return queryOptions({
		queryKey: ["sites"],
		queryFn: getSites,
	});
}

export function useSites() {
	return useQuery(sitesOptions());
}
