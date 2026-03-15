import type { CurrencyCode } from "@api-public/modules/products/model";
import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web-public/lib/api-client";

const PRODUCT_LIST_STALE_TIME_MS = 120_000;
const PRODUCT_DETAIL_STALE_TIME_MS = 120_000;
const PRODUCT_ANALYTICS_STALE_TIME_MS = 90_000;

export type ProductsListResponse = Treaty.Data<typeof client.api.products.get>;
export type ProductDetailResponse = Treaty.Data<
	ReturnType<typeof client.api.products>["get"]
>;

export type ProductsListFilters = {
	page?: number;
	limit?: number;
};

export type ProductAnalyticsFilters = {
	currency?: CurrencyCode;
	countryCodes?: string[];
	includeEuAverage?: boolean;
};

function normalizeAnalyticsFilters(filters: ProductAnalyticsFilters = {}) {
	return {
		currency: filters.currency ?? "EUR",
		includeEuAverage: filters.includeEuAverage ?? false,
		...(filters.countryCodes?.length
			? {
					countryCodes: [...new Set(filters.countryCodes)].sort(),
				}
			: {}),
	};
}

function buildAnalyticsQuery(filters: ProductAnalyticsFilters = {}) {
	return normalizeAnalyticsFilters(filters);
}

function getErrorMessage(error: { status: unknown; value: unknown }) {
	if (error.status === 422) {
		return "Validation error";
	}

	if (error.status === 404) {
		return "Not found";
	}

	return typeof error.value === "string" ? error.value : "Request failed";
}

export async function getProducts(filters: ProductsListFilters = {}) {
	const query = {
		...(filters.page ? { page: filters.page } : {}),
		...(filters.limit ? { limit: filters.limit } : {}),
	};

	const response = await client.api.products.get({ query });

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export async function getProduct(productId: string) {
	const response = await client.api.products({ id: productId }).get();

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export async function getProductHistory(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	const response = await client.api.products({ id: productId }).history.get({
		query: buildAnalyticsQuery(filters),
	});

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export async function getProductCurrentPrices(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	const response = await client.api
		.products({ id: productId })
		.currentPrices.get({
			query: buildAnalyticsQuery(filters),
		});

	if (response.error) {
		throw new Error(getErrorMessage(response.error));
	}

	return response.data;
}

export type ProductHistoryResponse = Awaited<
	ReturnType<typeof getProductHistory>
>;
export type ProductCurrentPricesResponse = Awaited<
	ReturnType<typeof getProductCurrentPrices>
>;

export function productsOptions(filters: ProductsListFilters = {}) {
	return queryOptions({
		queryKey: ["public-products", filters],
		queryFn: () => getProducts(filters),
		staleTime: PRODUCT_LIST_STALE_TIME_MS,
	});
}

export function productOptions(productId: string) {
	return queryOptions({
		queryKey: ["public-product", productId],
		queryFn: () => getProduct(productId),
		enabled: !!productId,
		staleTime: PRODUCT_DETAIL_STALE_TIME_MS,
	});
}

export function productHistoryOptions(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	const normalizedFilters = normalizeAnalyticsFilters(filters);

	return queryOptions({
		queryKey: ["public-product-history", productId, normalizedFilters],
		queryFn: () => getProductHistory(productId, normalizedFilters),
		enabled:
			!!productId &&
			((normalizedFilters.countryCodes?.length ?? 0) > 0 ||
				normalizedFilters.includeEuAverage === true),
		staleTime: PRODUCT_ANALYTICS_STALE_TIME_MS,
	});
}

export function productCurrentPricesOptions(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	const normalizedFilters = normalizeAnalyticsFilters(filters);

	return queryOptions({
		queryKey: ["public-product-current-prices", productId, normalizedFilters],
		queryFn: () => getProductCurrentPrices(productId, normalizedFilters),
		enabled: !!productId && (normalizedFilters.countryCodes?.length ?? 1) > 0,
		staleTime: PRODUCT_ANALYTICS_STALE_TIME_MS,
	});
}

export function useProducts(filters: ProductsListFilters = {}) {
	return useQuery(productsOptions(filters));
}

export function useProduct(productId: string) {
	return useQuery(productOptions(productId));
}

export function useProductHistory(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	return useQuery(productHistoryOptions(productId, filters));
}

export function useProductCurrentPrices(
	productId: string,
	filters: ProductAnalyticsFilters = {},
) {
	return useQuery(productCurrentPricesOptions(productId, filters));
}
