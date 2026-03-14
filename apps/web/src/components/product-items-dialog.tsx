import { useQueryClient } from "@tanstack/react-query";
import {
	productOptions,
	useLinkItemToProduct,
	useProduct,
	useUnlinkItemFromProduct,
} from "@web/api/products";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@web/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { ScrollArea } from "@web/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { Spinner } from "@web/components/ui/spinner";
import {
	Link2Icon,
	PlusIcon,
	TriangleAlertIcon,
	UnlinkIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type ItemOption = {
	id: string;
	name: string | null;
	url: string;
	site: {
		name: string;
		country: {
			code: string;
			currency: string;
		};
	};
};

export function ProductItemsDialog({
	product,
	items,
}: {
	product: { id: string; name: string };
	items: ItemOption[];
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
	const [normalizationFactor, setNormalizationFactor] = useState("1");
	const [validationError, setValidationError] = useState<string | null>(null);
	const {
		data: productDetail,
		isPending: isLoadingProduct,
		error: productError,
	} = useProduct(product.id);
	const {
		mutateAsync: linkItem,
		isPending: isLinking,
		error: linkError,
		reset: resetLink,
	} = useLinkItemToProduct();
	const {
		mutateAsync: unlinkItem,
		isPending: isUnlinking,
		error: unlinkError,
		reset: resetUnlink,
	} = useUnlinkItemFromProduct();

	const linkedItemIds = useMemo(
		() =>
			new Set(productDetail?.productItems.map((entry) => entry.item.id) ?? []),
		[productDetail],
	);

	const availableItems = useMemo(
		() => items.filter((item) => !linkedItemIds.has(item.id)),
		[items, linkedItemIds],
	);

	const refreshProduct = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["products"] }),
			queryClient.invalidateQueries({
				queryKey: productOptions(product.id).queryKey,
			}),
		]);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					setSelectedItemId(null);
					setNormalizationFactor("1");
					setValidationError(null);
					resetLink();
					resetUnlink();
				}
			}}
		>
			<DialogTrigger render={<Button variant="secondary" size="sm" />}>
				<Link2Icon data-icon="inline-start" />
				Manage items
			</DialogTrigger>
			<DialogContent className="flex max-h-[90vh] flex-col gap-5 sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Manage items for {product.name}</DialogTitle>
					<DialogDescription>
						Link or unlink items for this product.
					</DialogDescription>
				</DialogHeader>

				{(productError || linkError || unlinkError || validationError) && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>
							{productError?.message ||
								linkError?.message ||
								unlinkError?.message ||
								validationError ||
								"Failed to update product items"}
						</AlertTitle>
						<AlertDescription>
							Refresh the page if this persists. The API rejected the current
							item association request.
						</AlertDescription>
					</Alert>
				)}

				{isLoadingProduct ? (
					<div className="flex min-h-52 items-center justify-center rounded-xl border bg-muted/20">
						<Spinner className="size-5" />
					</div>
				) : (
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={`link-item-${product.id}`}>
								Add linked item
							</FieldLabel>
							<Select
								items={availableItems.map((item) => ({
									label: item.name || item.url,
									value: item.id,
								}))}
								value={selectedItemId}
								onValueChange={(value) => setSelectedItemId(value)}
							>
								<SelectTrigger
									id={`link-item-${product.id}`}
									className="w-full"
								>
									<SelectValue placeholder="Select an available item" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{availableItems.map((item) => (
											<SelectItem key={item.id} value={item.id}>
												<div className="flex w-full items-center justify-between gap-3">
													<span className="truncate">
														{item.name || item.url}
													</span>
													<span className="text-muted-foreground text-xs">
														{item.site.name} · {item.site.country.code}
													</span>
												</div>
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor={`normalization-factor-${product.id}`}>
								Normalization factor
							</FieldLabel>
							<Input
								id={`normalization-factor-${product.id}`}
								inputMode="decimal"
								value={normalizationFactor}
								onChange={(event) => {
									setNormalizationFactor(event.target.value);
									setValidationError(null);
								}}
								placeholder="1"
							/>
						</Field>

						<div className="flex justify-end">
							<Button
								disabled={!selectedItemId || isLinking || isUnlinking}
								onClick={async () => {
									if (!selectedItemId) return;
									const trimmedFactor = normalizationFactor.trim();
									const parsedFactor = Number(trimmedFactor);

									if (
										!trimmedFactor ||
										!Number.isFinite(parsedFactor) ||
										parsedFactor <= 0
									) {
										setValidationError(
											"Normalization factor must be a number greater than 0.",
										);
										return;
									}

									try {
										await linkItem({
											productId: product.id,
											itemId: selectedItemId,
											normalizationFactor: trimmedFactor,
										});
										await refreshProduct();
										setSelectedItemId(null);
										setNormalizationFactor("1");
										setValidationError(null);
									} catch {
										return;
									}
								}}
							>
								{isLinking ? (
									<Spinner className="size-4" />
								) : (
									<PlusIcon data-icon="inline-start" />
								)}
								Link item
							</Button>
						</div>

						<div className="space-y-3 rounded-xl border bg-muted/20 p-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="font-medium text-sm">Linked items</p>
									<p className="text-muted-foreground text-sm">
										These entries currently roll up into this product group.
										{productDetail?.comparisonBasis
											? ` Prices are normalized to ${productDetail.comparisonBasis}.`
											: ""}
									</p>
								</div>
								<Badge variant="outline">
									{productDetail?.productItems.length ?? 0} linked
								</Badge>
							</div>

							{productDetail?.productItems.length ? (
								<ScrollArea className="h-72 w-full overflow-hidden rounded-lg">
									<div className="space-y-3 pr-3">
										{productDetail.productItems.map(
											({ item, normalizationFactor: factor }) => (
												<div
													key={item.id}
													className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
												>
													<div className="min-w-0 space-y-1 sm:flex-1">
														<p className="truncate font-medium text-sm">
															{item.name || item.url}
														</p>
														<p className="truncate text-muted-foreground text-sm">
															{item.site.name} · {item.site.country.code} ·{" "}
															{item.url}
														</p>
														<p className="text-muted-foreground text-xs">
															Normalization factor ×{" "}
															{formatNormalizationFactor(factor)}
														</p>
													</div>
													<Button
														variant="ghost"
														size="sm"
														disabled={isLinking || isUnlinking}
														onClick={async () => {
															try {
																await unlinkItem({
																	productId: product.id,
																	itemId: item.id,
																});
																await refreshProduct();
															} catch {
																return;
															}
														}}
													>
														{isUnlinking ? (
															<Spinner className="size-4" />
														) : (
															<UnlinkIcon data-icon="inline-start" />
														)}
														Unlink
													</Button>
												</div>
											),
										)}
									</div>
								</ScrollArea>
							) : (
								<div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
									<p className="font-medium text-sm">No linked items yet</p>
									<p className="mt-1 text-muted-foreground text-sm">
										Use the selector above to attach tracked site items to this
										product.
									</p>
								</div>
							)}
						</div>
					</FieldGroup>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function formatNormalizationFactor(value: string | number) {
	const parsedValue = Number(value);

	if (!Number.isFinite(parsedValue)) {
		return String(value);
	}

	return parsedValue
		.toFixed(parsedValue >= 1 ? 2 : 4)
		.replace(/\.0+$/, "")
		.replace(/(\.\d*?)0+$/, "$1");
}
