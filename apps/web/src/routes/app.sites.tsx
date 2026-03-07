import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { countriesOptions, useCountries } from "@web/api/countries";
import { sitesOptions, useDeleteSite, useSites } from "@web/api/sites";
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
import { Field, FieldGroup, FieldLabel } from "@web/components/ui/field";
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
	ServerIcon,
	ShieldCheckIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
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
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-primary/5 p-6">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_70%)] lg:block" />
				<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<Badge variant="secondary" className="rounded-full px-3 py-1">
							Scraping infrastructure
						</Badge>
						<div className="space-y-2">
							<h1 className="font-semibold text-3xl tracking-tight">Sites</h1>
							<p className="max-w-xl text-muted-foreground text-sm sm:text-base">
								Manage retail sources, scraping selectors, and market assignment
								for every tracked site.
							</p>
						</div>
					</div>
					<AddSiteDialog countries={countries} />
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<StatCard
					label="Filtered sites"
					value={sortedSites.length}
					icon={<ServerIcon className="size-5" />}
				/>
				<StatCard
					label="Countries covered"
					value={coveredCountries}
					icon={<Globe2Icon className="size-5" />}
				/>
				<StatCard
					label="Browser strategy"
					value={browserSites}
					icon={<ShieldCheckIcon className="size-5" />}
				/>
			</section>

			<section>
				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							Narrow the site list by country when you are reviewing selectors.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup className="sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
							<Field>
								<FieldLabel htmlFor="sites-country-filter">Country</FieldLabel>
								<Select
									items={countries.map((country) => ({
										label: country.name,
										value: country.id,
									}))}
									value={countryIdFilter}
									onValueChange={(value) => setCountryIdFilter(value)}
								>
									<SelectTrigger id="sites-country-filter" className="w-full">
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
							</Field>
							<Button
								variant="outline"
								onClick={() => setCountryIdFilter(null)}
								disabled={!countryIdFilter}
							>
								Reset filter
							</Button>
						</FieldGroup>
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<CardTitle>Configured sites</CardTitle>
						<CardDescription>
							Every entry defines the scraping selectors and strategy for one
							host.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{sortedSites.length === 0 ? (
							<EmptyState
								title="No sites found"
								description="Add a site to start attaching items and scraping selectors."
								action={<AddSiteDialog countries={countries} />}
							/>
						) : (
							<div className="divide-y">
								{sortedSites.map((site) => (
									<div
										key={site.id}
										className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/30 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] xl:items-center"
									>
										<div className="min-w-0 space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate font-medium text-base">
													{site.name}
												</p>
												<Badge variant="outline">{site.country.code}</Badge>
												<Badge>{site.strategy}</Badge>
											</div>
											<p className="truncate text-muted-foreground text-sm">
												{site.hostname} · {site.country.name} ·{" "}
												{site.country.currency}
											</p>
										</div>

										<div className="grid gap-2 sm:grid-cols-3">
											<div className="rounded-lg border bg-background px-3 py-2">
												<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
													Price selector
												</p>
												<p className="mt-1 truncate font-mono text-sm">
													{site.priceCssSelector}
												</p>
											</div>
											<div className="rounded-lg border bg-background px-3 py-2">
												<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
													Price divisor
												</p>
												<p className="mt-1 font-mono text-sm">
													{site.priceDivisor}
												</p>
											</div>
											<div className="rounded-lg border bg-background px-3 py-2">
												<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
													Name selector
												</p>
												<p className="mt-1 truncate font-mono text-sm">
													{site.nameCssSelector}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-2 xl:justify-end">
											<EditSiteDialog site={site} countries={countries} />
											<DeleteSiteButton site={site} />
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
				<ServerIcon className="size-6" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-base">{title}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{action}
		</div>
	);
}
