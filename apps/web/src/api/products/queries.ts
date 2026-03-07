import type { Treaty } from "@elysiajs/eden";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type ProductsListResponse = Treaty.Data<typeof client.api.products.get>;
export type ProductDetailResponse = Treaty.Data<
	ReturnType<typeof client.api.products>["get"]
>;

export type ProductsListFilters = {
	page?: number;
	limit?: number;
};

export async function getProducts(filters: ProductsListFilters = {}) {
	const query = {
		...(filters.page ? { page: filters.page } : {}),
		...(filters.limit ? { limit: filters.limit } : {}),
	};

	const response = await client.api.products.get({ query });

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function getProduct(productId: string) {
	const response = await client.api.products({ id: productId }).get();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function productsOptions(filters: ProductsListFilters = {}) {
	return queryOptions({
		queryKey: ["products", filters],
		queryFn: () => getProducts(filters),
	});
}

export function productOptions(productId: string) {
	return queryOptions({
		queryKey: ["product", productId],
		queryFn: () => getProduct(productId),
		enabled: !!productId,
	});
}

export function useProducts(filters: ProductsListFilters = {}) {
	return useQuery(productsOptions(filters));
}

export function useProduct(productId: string) {
	return useQuery(productOptions(productId));
}
