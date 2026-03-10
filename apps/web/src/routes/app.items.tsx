import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { itemsOptions, useDeleteItem, useItems } from "@web/api/items";
import { sitesOptions, useSites } from "@web/api/sites";
import { AddItemDialog } from "@web/components/item-dialog";
import { PageHeader } from "@web/components/page-header";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import {
	Link2Icon,
	SearchIcon,
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
		<div className="space-y-4">
			<PageHeader
				title="Items"
				description={`${filteredItems.length} items · ${activeSites} sites · ${activeCountries} markets`}
				actions={<AddItemDialog sites={sites} />}
			/>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search items..."
						className="w-64 pl-9"
					/>
				</div>
				<Select
					items={sites.map((site) => ({
						label: site.name,
						value: site.id,
					}))}
					value={siteIdFilter}
					onValueChange={(value) => setSiteIdFilter(value)}
				>
					<SelectTrigger className="w-48">
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
				{(search || siteIdFilter) && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setSearch("");
							setSiteIdFilter(null);
						}}
					>
						Reset
					</Button>
				)}
			</div>

			{filteredItems.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<div className="rounded-xl bg-muted p-3 text-muted-foreground">
							<Link2Icon className="size-5" />
						</div>
						<p className="text-muted-foreground text-sm">
							No items found. Adjust filters or add a new item.
						</p>
						<AddItemDialog sites={sites} />
					</CardContent>
				</Card>
			) : (
				<Card className="overflow-hidden p-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>Name</TableHead>
								<TableHead>URL</TableHead>
								<TableHead className="w-32">Site</TableHead>
								<TableHead className="w-20">Country</TableHead>
								<TableHead className="w-16 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredItems.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="max-w-xs truncate font-medium">
										{item.name || "Unnamed"}
									</TableCell>
									<TableCell className="max-w-3xs truncate text-muted-foreground text-xs">
										{item.url}
									</TableCell>
									<TableCell className="text-sm">{item.site.name}</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs">
											{item.site.country.code}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<DeleteItemButton item={item} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}
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
