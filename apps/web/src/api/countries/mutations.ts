import type { Treaty } from "@elysiajs/eden";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type CreateCountryInput = Pick<
	Treaty.Data<typeof client.api.countries.post>,
	"name" | "code" | "currency"
>;

export type UpdateCountryInput = CreateCountryInput & {
	countryId: string;
};

export async function createCountry({
	name,
	code,
	currency,
}: CreateCountryInput) {
	const response = await client.api.countries.post({
		name,
		code,
		currency,
	});

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function updateCountry({
	countryId,
	name,
	code,
	currency,
}: UpdateCountryInput) {
	const response = await client.api.countries({ id: countryId }).put({
		name,
		code,
		currency,
	});

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

export async function deleteCountry({ countryId }: { countryId: string }) {
	const response = await client.api.countries({ id: countryId }).delete();

	if (response.error) {
		throw new Error(
			response.error.status === 422 ? "Validation error" : response.error.value,
		);
	}

	return response.data;
}

// ============ OPTIONS =============

export function createCountryOptions() {
	return mutationOptions({
		mutationKey: ["createCountry"],
		mutationFn: createCountry,
	});
}

export function updateCountryOptions() {
	return mutationOptions({
		mutationKey: ["updateCountry"],
		mutationFn: updateCountry,
	});
}

export function deleteCountryOptions() {
	return mutationOptions({
		mutationKey: ["deleteCountry"],
		mutationFn: deleteCountry,
	});
}

// =========== HOOKS =============

export function useCreateCountry() {
	return useMutation(createCountryOptions());
}

export function useUpdateCountry() {
	return useMutation(updateCountryOptions());
}

export function useDeleteCountry() {
	return useMutation(deleteCountryOptions());
}
