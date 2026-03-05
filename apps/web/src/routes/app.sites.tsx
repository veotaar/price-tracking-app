import { createFileRoute } from "@tanstack/react-router";
import { sitesOptions } from "@web/api/sites";

export const Route = createFileRoute("/app/sites")({
	loader: ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData(sitesOptions());
	},
	component: RouteComponent,
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();

	return loaderData.map((site) => (
		<div key={site.id} className="border-b py-2">
			<p>{site.name}</p>
			<p>{site.hostname}</p>
			<p>Price CSS Selector: {site.priceCssSelector}</p>
			<p>Name CSS Selector: {site.nameCssSelector}</p>
			<p>Strategy: {site.strategy}</p>
			<p>{site.country.code}</p>
			<p>{site.country.currency}</p>
		</div>
	));
}
