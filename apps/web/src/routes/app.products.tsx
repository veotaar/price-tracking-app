import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { itemsOptions, useItems } from "@web/api/items";
import {
	productsOptions,
	useDeleteProduct,
	useProducts,
} from "@web/api/products";
import { PageHeader } from "@web/components/page-header";
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
import { BoxesIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
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

	return (
		<div className="space-y-4">
			<PageHeader
				title="Products"
				description={`${response.pagination.total} products · Page ${response.pagination.page} of ${response.pagination.totalPages || 1}`}
				actions={<AddProductDialog />}
			/>

			{response.data.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<div className="rounded-xl bg-muted p-3 text-muted-foreground">
							<BoxesIcon className="size-5" />
						</div>
						<p className="text-muted-foreground text-sm">
							No products yet. Create one to start grouping items.
						</p>
						<AddProductDialog />
					</CardContent>
				</Card>
			) : (
				<>
					<div className="grid gap-4 xl:grid-cols-2">
						{response.data.map((product) => (
							<Card key={product.id} className="flex flex-col py-0">
								<CardHeader className="border-b py-3">
									<div className="flex flex-col gap-2">
										<div className="flex min-w-0 items-center gap-2">
											<CardTitle className="truncate text-base">
												{product.name}
											</CardTitle>
											<Badge variant="outline" className="shrink-0 text-xs">
												{product.productItems.length} linked
											</Badge>
										</div>
										<div className="flex items-center gap-1">
											<Link
												to="/app/product/$productId"
												params={{ productId: product.id }}
												className={buttonVariants({
													variant: "ghost",
													size: "xs",
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
								<CardContent className="flex-1 pt-3 pb-3">
									<div className="flex flex-wrap gap-1.5">
										{product.productItems.length ? (
											product.productItems.map(({ item }) => (
												<Badge
													key={item.id}
													variant="secondary"
													className="max-w-full truncate text-xs"
												>
													{item.name || item.url}
												</Badge>
											))
										) : (
											<p className="text-muted-foreground text-xs">
												No linked items yet.
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Pagination */}
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
									onClick={() => setPage((c) => Math.max(1, c - 1))}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= response.pagination.totalPages}
									onClick={() =>
										setPage((c) =>
											Math.min(response.pagination.totalPages, c + 1),
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
