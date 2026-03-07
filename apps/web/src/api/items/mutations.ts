import type { Treaty } from "@elysiajs/eden";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type CreateItemInput = Pick<
	Treaty.Data<typeof client.api.items.post>,
	"siteId" | "url" | "name"
>;

export async function createItem({ siteId, url, name }: CreateItemInput) {
	const response = await client.api.items.post({
		siteId,
		url,
		...(name ? { name } : {}),
	});

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function deleteItem({ itemId }: { itemId: string }) {
	const response = await client.api.items({ id: itemId }).delete();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function createItemOptions() {
	return mutationOptions({
		mutationKey: ["createItem"],
		mutationFn: createItem,
	});
}

export function deleteItemOptions() {
	return mutationOptions({
		mutationKey: ["deleteItem"],
		mutationFn: deleteItem,
	});
}

export function useCreateItem() {
	return useMutation(createItemOptions());
}

export function useDeleteItem() {
	return useMutation(deleteItemOptions());
}
