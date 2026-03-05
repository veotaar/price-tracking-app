import { queryOptions, useQuery } from "@tanstack/react-query";
import { client } from "@web/lib/api-client";

export async function getCountries() {
	const response = await client.api.countries.get();

	if (response.error) {
		throw new Error(response.error.value);
	}

	return response.data;
}

export function countriesOptions() {
	return queryOptions({
		queryKey: ["countries"],
		queryFn: getCountries,
	});
}

export function useCountries() {
	return useQuery(countriesOptions());
}
