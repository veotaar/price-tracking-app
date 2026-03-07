import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { itemsOptions, useDeleteItem, useItems } from "@web/api/items";
import { sitesOptions, useSites } from "@web/api/sites";
import { AddItemDialog } from "@web/components/item-dialog";
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
import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
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
	Globe2Icon,
	Link2Icon,
	SearchIcon,
	StoreIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useDeferredValue, useState } from "react";

export const Route = createFileRoute("/app/items")({
	loader: async ({ context: { queryClient } }) => {
		const [items, sites] = await Promise.all([
			queryClient.ensureQueryData(itemsOptions()),
			queryClient.ensureQueryData(sitesOptions()),
		]);

		return { items, sites };
	},
	component: RouteComponent,
	errorComponent: () => (
		<div className="flex min-h-[40dvh] items-center justify-center">
			<Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle>Failed to load items</CardTitle>
					<CardDescription>
						The tracked item list could not be fetched. Confirm your admin
						session and API connectivity.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	),
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [siteIdFilter, setSiteIdFilter] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim());
	const { data: sites = loaderData.sites } = useSites();
	const { data: items = loaderData.items } = useItems({
		search: deferredSearch || undefined,
		siteId: siteIdFilter || undefined,
	});

	const filteredItems = [...items].sort((left, right) =>
		(left.name || left.url).localeCompare(right.name || right.url),
	);
	const activeSites = new Set(filteredItems.map((item) => item.site.id)).size;
	const activeCountries = new Set(
		filteredItems.map((item) => item.site.country.id),
	).size;

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-primary/5 p-6">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_70%)] lg:block" />
				<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<Badge variant="secondary" className="rounded-full px-3 py-1">
							Tracked catalog
						</Badge>
						<div className="space-y-2">
							<h1 className="font-semibold text-3xl tracking-tight">Items</h1>
							<p className="max-w-xl text-muted-foreground text-sm sm:text-base">
								Track individual listing URLs, monitor their source sites, and
								keep the scrape queue aligned with your product catalog.
							</p>
						</div>
					</div>
					<AddItemDialog sites={sites} />
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<StatCard
					label="Filtered items"
					value={filteredItems.length}
					icon={<Link2Icon className="size-5" />}
				/>
				<StatCard
					label="Active sites"
					value={activeSites}
					icon={<StoreIcon className="size-5" />}
				/>
				<StatCard
					label="Markets represented"
					value={activeCountries}
					icon={<Globe2Icon className="size-5" />}
				/>
			</section>

			<section>
				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							Search by listing name and narrow the list to a specific site.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_auto] lg:items-end">
							<Field>
								<FieldLabel htmlFor="items-search">Search</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="items-search"
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search by item name"
										className="pl-9"
									/>
								</div>
							</Field>

							<Field>
								<FieldLabel htmlFor="items-site-filter">Site</FieldLabel>
								<Select
									items={sites.map((site) => ({
										label: site.name,
										value: site.id,
									}))}
									value={siteIdFilter}
									onValueChange={(value) => setSiteIdFilter(value)}
								>
									<SelectTrigger id="items-site-filter" className="w-full">
										<SelectValue placeholder="All sites" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{sites.map((site) => (
												<SelectItem key={site.id} value={site.id}>
													{site.name} ({site.country.code})
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>

							<Button
								variant="outline"
								onClick={() => {
									setSearch("");
									setSiteIdFilter(null);
								}}
								disabled={!search && !siteIdFilter}
							>
								Reset filters
							</Button>
						</FieldGroup>
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<CardTitle>Tracked items</CardTitle>
						<CardDescription>
							Each item points to one site listing and participates in the
							scrape schedule.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{filteredItems.length === 0 ? (
							<EmptyState
								title="No items found"
								description="Adjust the filters or add a new tracked item URL."
								action={<AddItemDialog sites={sites} />}
							/>
						) : (
							<div className="divide-y">
								{filteredItems.map((item) => (
									<div
										key={item.id}
										className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/30 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] xl:items-center"
									>
										<div className="min-w-0 space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate font-medium text-base">
													{item.name || "Unnamed listing"}
												</p>
												<Badge variant="outline">
													{item.site.country.code}
												</Badge>
											</div>
											<p className="truncate text-muted-foreground text-sm">
												{item.url}
											</p>
										</div>

										<div className="space-y-2 rounded-lg border bg-background px-3 py-3">
											<p className="font-medium text-sm">{item.site.name}</p>
											<p className="text-muted-foreground text-sm">
												{item.site.country.name} · {item.site.country.currency}
											</p>
										</div>

										<div className="flex items-center gap-2 xl:justify-end">
											<DeleteItemButton item={item} />
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function DeleteItemButton({
	item,
}: {
	item: { id: string; name: string | null; url: string };
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { mutateAsync, isPending, error, reset } = useDeleteItem();

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
					<AlertDialogTitle>
						Delete {item.name || "this item"}?
					</AlertDialogTitle>
					<AlertDialogDescription>
						This removes the listing from active tracking and unschedules future
						scrapes for it.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>{error.message || "Failed to delete item"}</AlertTitle>
						<AlertDescription>
							The item could not be removed. Try again once the backend is
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
								await mutateAsync({ itemId: item.id });
								await queryClient.invalidateQueries({ queryKey: ["items"] });
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
						Delete item
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

function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
			<div className="rounded-2xl bg-muted p-4 text-muted-foreground">
				<Link2Icon className="size-6" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-base">{title}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{action}
		</div>
	);
}
