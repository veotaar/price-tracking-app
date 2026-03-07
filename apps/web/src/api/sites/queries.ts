import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type SitesResponse = Treaty.Data<typeof client.api.sites.get>;

export type SitesFilters = {
	countryId?: string;
};

export async function getSites(filters: SitesFilters = {}) {
	const query = {
		...(filters.countryId ? { countryId: filters.countryId } : {}),
	};

	const response = Object.keys(query).length
		? await client.api.sites.get({ query })
		: await client.api.sites.get();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function sitesOptions(filters: SitesFilters = {}) {
	return queryOptions({
		queryKey: ["sites", filters],
		queryFn: () => getSites(filters),
	});
}

export function useSites(filters: SitesFilters = {}) {
	return useQuery(sitesOptions(filters));
}
