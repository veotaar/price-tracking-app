import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { itemsOptions, useItems } from "@web/api/items";
import {
	productsOptions,
	useDeleteProduct,
	useProducts,
} from "@web/api/products";
import {
	AddProductDialog,
	EditProductDialog,
} from "@web/components/product-dialog";
import { ProductItemsDialog } from "@web/components/product-items-dialog";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@web/components/ui/alert-dialog";
import { Badge } from "@web/components/ui/badge";
import { Button, buttonVariants } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { Spinner } from "@web/components/ui/spinner";
import {
	BoxesIcon,
	ChevronsLeftRightEllipsisIcon,
	Link2Icon,
	PackageSearchIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";

const PRODUCTS_PER_PAGE = 12;

export const Route = createFileRoute("/app/products")({
	loader: async ({ context: { queryClient } }) => {
		const [products, items] = await Promise.all([
			queryClient.ensureQueryData(
				productsOptions({ page: 1, limit: PRODUCTS_PER_PAGE }),
			),
			queryClient.ensureQueryData(itemsOptions()),
		]);

		return { products, items };
	},
	component: RouteComponent,
	errorComponent: () => (
		<div className="flex min-h-[40dvh] items-center justify-center">
			<Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle>Failed to load products</CardTitle>
					<CardDescription>
						The product catalog could not be fetched. Confirm your session and
						API availability.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	),
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [page, setPage] = useState(1);
	const { data: items = loaderData.items } = useItems();
	const { data: response = loaderData.products } = useProducts({
		page,
		limit: PRODUCTS_PER_PAGE,
	});

	const linkedItemsInPage = response.data.reduce(
		(total, product) => total + product.productItems.length,
		0,
	);

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-primary/5 p-6">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_70%)] lg:block" />
				<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<Badge variant="secondary" className="rounded-full px-3 py-1">
							Grouped catalog
						</Badge>
						<div className="space-y-2">
							<h1 className="font-semibold text-3xl tracking-tight">
								Products
							</h1>
							<p className="max-w-xl text-muted-foreground text-sm sm:text-base">
								Group related items across sites, then manage which tracked
								listings roll up into each product.
							</p>
						</div>
					</div>
					<AddProductDialog />
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<StatCard
					label="Total products"
					value={response.pagination.total}
					icon={<BoxesIcon className="size-5" />}
				/>
				<StatCard
					label="Current page links"
					value={linkedItemsInPage}
					icon={<Link2Icon className="size-5" />}
				/>
				<StatCard
					label="Total pages"
					value={response.pagination.totalPages}
					icon={<PackageSearchIcon className="size-5" />}
				/>
			</section>

			<section className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 px-4 py-3">
				<div>
					<p className="font-medium text-sm">Pagination</p>
					<p className="text-muted-foreground text-sm">
						Page {response.pagination.page} of{" "}
						{response.pagination.totalPages || 1}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						disabled={page <= 1}
						onClick={() => setPage((current) => Math.max(1, current - 1))}
					>
						Previous
					</Button>
					<Button
						variant="outline"
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
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<CardTitle>Product groups</CardTitle>
						<CardDescription>
							Each product can collect multiple tracked items from different
							markets.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-4">
						{response.data.length === 0 ? (
							<EmptyState action={<AddProductDialog />} />
						) : (
							<div className="grid gap-4 xl:grid-cols-2">
								{response.data.map((product) => (
									<Card key={product.id} className="border bg-card py-0">
										<CardHeader className="border-b bg-muted/20 py-4">
											<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
												<div className="space-y-2">
													<div className="flex flex-wrap items-center gap-2">
														<CardTitle>{product.name}</CardTitle>
														<Badge variant="outline">
															{product.productItems.length} linked
														</Badge>
													</div>
													<CardDescription>
														Keep matching items grouped under one product record
														for cross-site comparison.
													</CardDescription>
												</div>
												<div className="flex flex-wrap items-center gap-2 sm:justify-end">
													<Link
														to="/app/product/$productId"
														params={{ productId: product.id }}
														className={buttonVariants({
															variant: "outline",
															size: "sm",
														})}
													>
														View
													</Link>
													<EditProductDialog product={product} />
													<ProductItemsDialog product={product} items={items} />
													<DeleteProductButton product={product} />
												</div>
											</div>
										</CardHeader>
										<CardContent className="space-y-3 pt-4">
											<div className="flex flex-wrap gap-2">
												{product.productItems.length ? (
													product.productItems.map(({ item }) => (
														<Badge
															key={item.id}
															variant="secondary"
															className="max-w-full truncate"
														>
															{item.name || item.url}
														</Badge>
													))
												) : (
													<p className="text-muted-foreground text-sm">
														No linked items yet. Use Manage items to attach
														listings.
													</p>
												)}
											</div>
											<div className="rounded-lg border bg-muted/20 px-3 py-3">
												<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
													Status
												</p>
												<p className="mt-1 text-sm">
													{product.productItems.length
														? "Product has active item associations ready for comparison."
														: "Product exists without linked source items yet."}
												</p>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function DeleteProductButton({
	product,
}: {
	product: { id: string; name: string };
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { mutateAsync, isPending, error, reset } = useDeleteProduct();

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) reset();
			}}
		>
			<AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
				<Trash2Icon data-icon="inline-start" />
				Delete
			</AlertDialogTrigger>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {product.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes the product grouping and its item links from the active
						catalog.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>
							{error.message || "Failed to delete product"}
						</AlertTitle>
						<AlertDescription>
							The product could not be removed. Try again once the backend is
							ready.
						</AlertDescription>
					</Alert>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={isPending}
						onClick={async () => {
							try {
								await mutateAsync({ productId: product.id });
								await queryClient.invalidateQueries({ queryKey: ["products"] });
								setOpen(false);
							} catch {
								return;
							}
						}}
					>
						{isPending ? (
							<Spinner className="size-4" />
						) : (
							<Trash2Icon data-icon="inline-start" />
						)}
						Delete product
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<div>
						<CardDescription>{label}</CardDescription>
						<CardTitle className="mt-2 text-3xl">{value}</CardTitle>
					</div>
					<div className="rounded-xl bg-primary/10 p-3 text-primary">
						{icon}
					</div>
				</div>
			</CardHeader>
		</Card>
	);
}

function EmptyState({ action }: { action: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
			<div className="rounded-2xl bg-muted p-4 text-muted-foreground">
				<ChevronsLeftRightEllipsisIcon className="size-6" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-base">No products yet</p>
				<p className="text-muted-foreground text-sm">
					Create the first product group, then link tracked items into it.
				</p>
			</div>
			{action}
		</div>
	);
}
