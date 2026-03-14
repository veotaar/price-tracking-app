import { createFileRoute, Link } from "@tanstack/react-router";
import { productsOptions, useProducts } from "@web-public/api/products/queries";
import { Badge } from "@web-public/components/ui/badge";
import { Button, buttonVariants } from "@web-public/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web-public/components/ui/card";
import { cn } from "@web-public/lib/utils";
import { ArrowRightIcon, BoxesIcon } from "lucide-react";
import { useState } from "react";

const PRODUCTS_PER_PAGE = 12;

export const Route = createFileRoute("/")({
	loader: async ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(
			productsOptions({ page: 1, limit: PRODUCTS_PER_PAGE }),
		),
	component: RouteComponent,
});

function ProductCard({
	product,
}: {
	product: {
		id: string;
		name: string;
		productItems: {
			item: { id: string; site: { country: { code: string } } };
		}[];
	};
}) {
	const itemCount = product.productItems.length;
	const countryCodes = [
		...new Set(product.productItems.map(({ item }) => item.site.country.code)),
	].sort();

	return (
		<Card className="flex flex-col border py-0">
			<CardHeader className="flex-1 py-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-1">
						<CardTitle className="text-lg leading-snug">
							{product.name}
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{itemCount} tracked {itemCount === 1 ? "item" : "items"} &middot;{" "}
							{countryCodes.length}{" "}
							{countryCodes.length === 1 ? "country" : "countries"}
						</p>
					</div>
					<Link
						to="/$productId"
						params={{ productId: product.id }}
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"shrink-0",
						)}
					>
						View details
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</div>
			</CardHeader>
			{countryCodes.length > 0 && (
				<CardContent className="border-t pt-3 pb-3">
					<div className="flex flex-wrap gap-1.5">
						{countryCodes.map((code) => (
							<Badge key={code} variant="secondary" className="text-xs">
								{code}
							</Badge>
						))}
					</div>
				</CardContent>
			)}
		</Card>
	);
}
function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [page, setPage] = useState(1);
	const { data: response = loaderData } = useProducts({
		page,
		limit: PRODUCTS_PER_PAGE,
	});

	return (
		<div className="space-y-8">
			<section>
				<h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
					Compare prices across countries
				</h1>
				<p className="mt-2 max-w-2xl text-muted-foreground sm:text-lg">
					Track price history and find the best deals for your favorite
					products.
				</p>
			</section>

			<section className="space-y-4">
				<div className="flex items-baseline justify-between">
					<h2 className="font-semibold text-lg tracking-tight">Products</h2>
					<p className="text-muted-foreground text-sm">
						{response.pagination.total}{" "}
						{response.pagination.total === 1 ? "product" : "products"}
					</p>
				</div>

				{response.data.length === 0 ? (
					<Card>
						<CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 py-12 text-center">
							<div className="rounded-xl bg-muted p-3 text-muted-foreground">
								<BoxesIcon className="size-5" />
							</div>
							<p className="text-muted-foreground text-sm">
								No products available yet.
							</p>
						</CardContent>
					</Card>
				) : (
					<>
						<div className="grid gap-4 xl:grid-cols-2">
							{response.data.map((product) => (
								<ProductCard key={product.id} product={product} />
							))}
						</div>

						{response.pagination.totalPages > 1 && (
							<div className="flex items-center justify-between pt-2">
								<p className="text-muted-foreground text-sm">
									Page {response.pagination.page} of{" "}
									{response.pagination.totalPages}
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() =>
											setPage((current) => Math.max(1, current - 1))
										}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= response.pagination.totalPages}
										onClick={() =>
											setPage((current) =>
												Math.min(response.pagination.totalPages, current + 1),
											)
										}
									>
										Next
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</section>
		</div>
	);
}
