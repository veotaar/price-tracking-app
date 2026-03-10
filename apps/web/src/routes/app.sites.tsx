import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { countriesOptions, useCountries } from "@web/api/countries";
import { sitesOptions, useDeleteSite, useSites } from "@web/api/sites";
import { PageHeader } from "@web/components/page-header";
import { AddSiteDialog, EditSiteDialog } from "@web/components/site-dialog";
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
import { ServerIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/sites")({
	loader: async ({ context: { queryClient } }) => {
		const [sites, countries] = await Promise.all([
			queryClient.ensureQueryData(sitesOptions()),
			queryClient.ensureQueryData(countriesOptions()),
		]);

		return { sites, countries };
	},
	component: RouteComponent,
	errorComponent: () => (
		<div className="flex min-h-[40dvh] items-center justify-center">
			<Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle>Failed to load sites</CardTitle>
					<CardDescription>
						The sites list could not be fetched. Confirm your admin session and
						API connectivity.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	),
});

function RouteComponent() {
	const loaderData = Route.useLoaderData();
	const [countryIdFilter, setCountryIdFilter] = useState<string | null>(null);
	const { data: countries = loaderData.countries } = useCountries();
	const { data: sites = loaderData.sites } = useSites({
		countryId: countryIdFilter || undefined,
	});

	const sortedSites = [...sites].sort((left, right) =>
		left.name.localeCompare(right.name),
	);
	const coveredCountries = new Set(sortedSites.map((site) => site.country.id))
		.size;
	const browserSites = sortedSites.filter(
		(site) => site.strategy === "browser",
	).length;

	return (
		<div className="space-y-4">
			<PageHeader
				title="Sites"
				description={`${sortedSites.length} sites · ${coveredCountries} countries · ${browserSites} browser`}
				actions={<AddSiteDialog countries={countries} />}
			/>

			{/* Filters */}
			<div className="flex items-center gap-2">
				<Select
					items={countries.map((c) => ({ label: c.name, value: c.id }))}
					value={countryIdFilter}
					onValueChange={(v) => setCountryIdFilter(v)}
				>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="All countries" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{countries.map((country) => (
								<SelectItem key={country.id} value={country.id}>
									{country.name} ({country.code})
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				{countryIdFilter && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setCountryIdFilter(null)}
					>
						Reset
					</Button>
				)}
			</div>

			{sortedSites.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<div className="rounded-xl bg-muted p-3 text-muted-foreground">
							<ServerIcon className="size-5" />
						</div>
						<p className="text-muted-foreground text-sm">
							No sites found. Add a site to start tracking prices.
						</p>
						<AddSiteDialog countries={countries} />
					</CardContent>
				</Card>
			) : (
				<Card className="overflow-hidden p-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>Name</TableHead>
								<TableHead>Hostname</TableHead>
								<TableHead className="w-28">Country</TableHead>
								<TableHead className="w-24">Strategy</TableHead>
								<TableHead>Price selector</TableHead>
								<TableHead className="w-16">Divisor</TableHead>
								<TableHead className="w-20 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedSites.map((site) => (
								<TableRow key={site.id}>
									<TableCell className="font-medium">{site.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{site.hostname}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs">
											{site.country.code}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge
											variant={
												site.strategy === "browser" ? "default" : "secondary"
											}
											className="text-xs"
										>
											{site.strategy}
										</Badge>
									</TableCell>
									<TableCell className="max-w-40 truncate font-mono text-muted-foreground text-xs">
										{site.priceCssSelector}
									</TableCell>
									<TableCell className="font-mono text-xs">
										{site.priceDivisor}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<EditSiteDialog site={site} countries={countries} />
											<DeleteSiteButton site={site} />
										</div>
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

function DeleteSiteButton({
	site,
}: {
	site: { id: string; name: string; hostname: string };
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { mutateAsync, isPending, error, reset } = useDeleteSite();

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
					<AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes {site.hostname} from the active site catalog and
						prevents new item tracking under this source.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>{error.message || "Failed to delete site"}</AlertTitle>
						<AlertDescription>
							Try again after checking whether the site is still referenced by
							other records.
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
								await mutateAsync({ siteId: site.id });
								await queryClient.invalidateQueries({ queryKey: ["sites"] });
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
						Delete site
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
