import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

function getErrorMessage(error: { status: unknown; value: unknown }) {
	if (error.status === 422) {
		return "Validation error";
	}

	return typeof error.value === "string" ? error.value : "Request failed";
}

export type SearchItemsResponse = Treaty.Data<
	typeof client.api.search.items.get
>;
export type SearchSitesResponse = Treaty.Data<
	typeof client.api.search.sites.get
>;

export type SearchItemsFilters = {
	search?: string;
	siteId?: string;
	perPage?: number;
};

export type SearchSitesFilters = {
	search?: string;
	countryId?: string;
	perPage?: number;
};

export async function getSearchItems(filters: SearchItemsFilters = {}) {
	const query = {
		...(filters.search ? { q: filters.search } : {}),
		...(filters.siteId ? { siteId: filters.siteId } : {}),
		...(filters.perPage ? { perPage: filters.perPage } : {}),
	};

	const response = Object.keys(query).length
		? await client.api.search.items.get({ query })
		: await client.api.search.items.get();

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export async function getSearchSites(filters: SearchSitesFilters = {}) {
	const query = {
		...(filters.search ? { q: filters.search } : {}),
		...(filters.countryId ? { countryId: filters.countryId } : {}),
		...(filters.perPage ? { perPage: filters.perPage } : {}),
	};

	const response = Object.keys(query).length
		? await client.api.search.sites.get({ query })
		: await client.api.search.sites.get();

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export function searchItemsOptions(filters: SearchItemsFilters = {}) {
	return queryOptions({
		queryKey: ["search", "items", filters],
		queryFn: () => getSearchItems(filters),
	});
}

export function useSearchItems(filters: SearchItemsFilters = {}) {
	return useQuery(searchItemsOptions(filters));
}

export function searchSitesOptions(filters: SearchSitesFilters = {}) {
	return queryOptions({
		queryKey: ["search", "sites", filters],
		queryFn: () => getSearchSites(filters),
	});
}

export function useSearchSites(filters: SearchSitesFilters = {}) {
	return useQuery(searchSitesOptions(filters));
}
