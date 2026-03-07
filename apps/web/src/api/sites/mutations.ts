import type { Treaty } from "@elysiajs/eden";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type CreateSiteInput = Pick<
	Treaty.Data<typeof client.api.sites.post>,
	| "countryId"
	| "hostname"
	| "name"
	| "nameCssSelector"
	| "priceDivisor"
	| "priceCssSelector"
	| "strategy"
>;

export type UpdateSiteInput = CreateSiteInput & {
	siteId: string;
};

export async function createSite(input: CreateSiteInput) {
	const response = await client.api.sites.post(input);

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function updateSite({ siteId, ...input }: UpdateSiteInput) {
	const response = await client.api.sites({ id: siteId }).put(input);

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function deleteSite({ siteId }: { siteId: string }) {
	const response = await client.api.sites({ id: siteId }).delete();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export function createSiteOptions() {
	return mutationOptions({
		mutationKey: ["createSite"],
		mutationFn: createSite,
	});
}

export function updateSiteOptions() {
	return mutationOptions({
		mutationKey: ["updateSite"],
		mutationFn: updateSite,
	});
}

export function deleteSiteOptions() {
	return mutationOptions({
		mutationKey: ["deleteSite"],
		mutationFn: deleteSite,
	});
}

export function useCreateSite() {
	return useMutation(createSiteOptions());
}

export function useUpdateSite() {
	return useMutation(updateSiteOptions());
}

export function useDeleteSite() {
	return useMutation(deleteSiteOptions());
}
