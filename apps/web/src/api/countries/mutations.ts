import type { Treaty } from "@elysiajs/eden";
import { mutationOptions } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export type CreateCountryInput = Pick<
	Treaty.Data<typeof client.api.countries.post>,
	"name" | "code" | "currency"
>;

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

export function createCountryOptions() {
	return mutationOptions({
		mutationKey: ["createCountry"],
		mutationFn: createCountry,
	});
}
