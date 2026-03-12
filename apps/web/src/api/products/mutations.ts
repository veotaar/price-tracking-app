import type { Treaty } from "@elysiajs/eden";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type ProductsPaginationInput = {
	page?: number;
	limit?: number;
};

export type CreateProductInput = Pick<
	Treaty.Data<typeof client.api.products.post>,
	"name" | "published"
>;

export type UpdateProductInput = CreateProductInput & {
	productId: string;
};

export type LinkProductItemInput = {
	productId: string;
	itemId: string;
};

export async function createProduct(input: CreateProductInput) {
	const response = await client.api.products.post(input);

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function updateProduct({
	productId,
	...input
}: UpdateProductInput) {
	const response = await client.api.products({ id: productId }).put(input);

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function deleteProduct({ productId }: { productId: string }) {
	const response = await client.api.products({ id: productId }).delete();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function linkItemToProduct({
	productId,
	itemId,
}: LinkProductItemInput) {
	const response = await client.api
		.products({ id: productId })
		.items.post({ itemId });

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function unlinkItemFromProduct({
	productId,
	itemId,
}: LinkProductItemInput) {
	const response = await client.api
		.products({ id: productId })
		.items({
			itemId,
		})
		.delete();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function createProductOptions() {
	return mutationOptions({
		mutationKey: ["createProduct"],
		mutationFn: createProduct,
	});
}

export function updateProductOptions() {
	return mutationOptions({
		mutationKey: ["updateProduct"],
		mutationFn: updateProduct,
	});
}

export function deleteProductOptions() {
	return mutationOptions({
		mutationKey: ["deleteProduct"],
		mutationFn: deleteProduct,
	});
}

export function linkItemToProductOptions() {
	return mutationOptions({
		mutationKey: ["linkItemToProduct"],
		mutationFn: linkItemToProduct,
	});
}

export function unlinkItemFromProductOptions() {
	return mutationOptions({
		mutationKey: ["unlinkItemFromProduct"],
		mutationFn: unlinkItemFromProduct,
	});
}

export function useCreateProduct() {
	return useMutation(createProductOptions());
}

export function useUpdateProduct() {
	return useMutation(updateProductOptions());
}

export function useDeleteProduct() {
	return useMutation(deleteProductOptions());
}

export function useLinkItemToProduct() {
	return useMutation(linkItemToProductOptions());
}

export function useUnlinkItemFromProduct() {
	return useMutation(unlinkItemFromProductOptions());
}
