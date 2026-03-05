import { createFileRoute } from "@tanstack/react-router";
import { countriesOptions } from "@web/api/countries";

export const Route = createFileRoute("/app/countries")({
	loader: ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData(countriesOptions());
	},
	component: RouteComponent,
	errorComponent: () => <div>Failed to load countries.</div>,
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();

	return loaderData.map((country) => (
		<div key={country.id} className="border-b py-2">
			<p>{country.name}</p>
			<p>{country.code}</p>
			<p>{country.currency}</p>
		</div>
	));
}
