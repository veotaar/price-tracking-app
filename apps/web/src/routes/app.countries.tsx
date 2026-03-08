import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	countriesOptions,
	useCountries,
	useDeleteCountry,
} from "@web/api/countries";
import {
	AddCountryDialog,
	EditCountryDialog,
} from "@web/components/add-country-dialog";
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
import { Spinner } from "@web/components/ui/spinner";
import {
	Globe2Icon,
	LandmarkIcon,
	MapPinnedIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/countries")({
	loader: ({ context: { queryClient } }) => {
		return queryClient.ensureQueryData(countriesOptions());
	},
	component: RouteComponent,
	errorComponent: () => (
		<div className="flex min-h-[40dvh] items-center justify-center">
			<Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle>Failed to load countries</CardTitle>
					<CardDescription>
						The countries list could not be fetched. Confirm that you are signed
						in with an admin account and that the API is reachable.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	),
});

function RouteComponent() {
	const initialCountries = Route.useLoaderData();
	const { data: countries = initialCountries } = useCountries();
	const sortedCountries = [...countries].sort((left, right) =>
		left.name.localeCompare(right.name),
	);
	const currencyCount = new Set(
		sortedCountries.map((country) => country.currency),
	).size;
	const euMemberCount = sortedCountries.filter(
		(country) => country.euMember,
	).length;

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-accent-500/10 p-6">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_70%)] lg:block" />
				<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-3">
						<Badge variant="secondary" className="rounded-full px-3 py-1">
							Admin catalog
						</Badge>
						<div className="space-y-2">
							<h1 className="font-semibold text-3xl tracking-tight">
								Country registry
							</h1>
							<p className="max-w-xl text-muted-foreground text-sm sm:text-base">
								Manage the markets your sites can belong to. Each country
								defines the code and currency used downstream in scraping and
								pricing.
							</p>
						</div>
					</div>
					<AddCountryDialog />
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardDescription>Total countries</CardDescription>
								<CardTitle className="mt-2 text-3xl">
									{sortedCountries.length}
								</CardTitle>
							</div>
							<div className="rounded-xl bg-primary/10 p-3 text-primary">
								<Globe2Icon className="size-5" />
							</div>
						</div>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardDescription>Currencies covered</CardDescription>
								<CardTitle className="mt-2 text-3xl">{currencyCount}</CardTitle>
							</div>
							<div className="rounded-xl bg-primary/10 p-3 text-primary">
								<LandmarkIcon className="size-5" />
							</div>
						</div>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardDescription>EU member markets</CardDescription>
								<CardTitle className="mt-2 text-3xl">{euMemberCount}</CardTitle>
							</div>
							<div className="rounded-xl bg-primary/10 p-3 text-primary">
								<MapPinnedIcon className="size-5" />
							</div>
						</div>
					</CardHeader>
				</Card>
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<CardTitle>All countries</CardTitle>
						<CardDescription>
							A clean list of active country records available for site setup.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{sortedCountries.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
								<div className="rounded-2xl bg-muted p-4 text-muted-foreground">
									<Globe2Icon className="size-6" />
								</div>
								<div className="space-y-1">
									<p className="font-medium text-base">No countries yet</p>
									<p className="text-muted-foreground text-sm">
										Start by adding the first market to unlock site and item
										setup.
									</p>
								</div>
								<AddCountryDialog />
							</div>
						) : (
							<div className="divide-y">
								{sortedCountries.map((country) => (
									<div
										key={country.id}
										className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1.5fr)_120px_140px_auto] lg:items-center"
									>
										<div className="min-w-0 space-y-1">
											<p className="truncate font-medium text-base">
												{country.name}
											</p>
											<div className="flex flex-wrap items-center gap-2 text-sm">
												<p className="text-muted-foreground">
													Configured market for pricing and site assignment
												</p>
												<Badge
													variant={country.euMember ? "default" : "secondary"}
													className="rounded-md px-2 py-0.5"
												>
													{country.euMember ? "EU member" : "Non-EU"}
												</Badge>
											</div>
										</div>

										<div className="flex flex-col gap-1 md:items-start">
											<span className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
												Code
											</span>
											<Badge
												variant="outline"
												className="rounded-md px-2.5 py-1"
											>
												{country.code}
											</Badge>
										</div>

										<div className="flex flex-col gap-1 md:items-start">
											<span className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
												Currency
											</span>
											<Badge className="rounded-md px-2.5 py-1">
												{country.currency}
											</Badge>
										</div>

										<div className="flex items-center gap-2 lg:justify-end">
											<EditCountryDialog country={country} />
											<DeleteCountryButton country={country} />
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

function DeleteCountryButton({
	country,
}: {
	country: { id: string; name: string; code: string };
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const {
		mutateAsync: removeCountry,
		isPending,
		error,
		reset,
	} = useDeleteCountry();

	const handleDelete = async () => {
		try {
			await removeCountry({ countryId: country.id });
			await queryClient.invalidateQueries({
				queryKey: countriesOptions().queryKey,
			});
			setOpen(false);
		} catch {
			return;
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					reset();
				}
			}}
		>
			<AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
				<Trash2Icon data-icon="inline-start" />
				Delete
			</AlertDialogTrigger>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {country.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes the country from the active catalog. Any linked sites
						will no longer have a valid market unless they are reassigned.
					</AlertDialogDescription>
				</AlertDialogHeader>

				{error && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>
							{error.message || "Failed to delete country"}
						</AlertTitle>
						<AlertDescription>
							The country could not be deleted. Try again after checking whether
							it is still referenced.
						</AlertDescription>
					</Alert>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending ? (
							<Spinner className="size-4" />
						) : (
							<Trash2Icon data-icon="inline-start" />
						)}
						Delete country
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
