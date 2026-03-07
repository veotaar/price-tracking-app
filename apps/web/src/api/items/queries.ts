import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type ItemsResponse = Treaty.Data<typeof client.api.items.get>;

export type ItemsFilters = {
	search?: string;
	siteId?: string;
};

export async function getItems(filters: ItemsFilters = {}) {
	const query = {
		...(filters.search ? { search: filters.search } : {}),
		...(filters.siteId ? { siteId: filters.siteId } : {}),
	};

	const response = Object.keys(query).length
		? await client.api.items.get({ query })
		: await client.api.items.get();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function itemsOptions(filters: ItemsFilters = {}) {
	return queryOptions({
		queryKey: ["items", filters],
		queryFn: () => getItems(filters),
	});
}

export function useItems(filters: ItemsFilters = {}) {
	return useQuery(itemsOptions(filters));
}
