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
import { Spinner } from "@web/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import { Globe2Icon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
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
		<div className="space-y-4">
			<PageHeader
				title="Countries"
				description={`${sortedCountries.length} countries · ${currencyCount} currencies · ${euMemberCount} EU`}
				actions={<AddCountryDialog />}
			/>

			{sortedCountries.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<div className="rounded-xl bg-muted p-3 text-muted-foreground">
							<Globe2Icon className="size-5" />
						</div>
						<p className="text-muted-foreground text-sm">
							No countries yet. Add the first market to get started.
						</p>
						<AddCountryDialog />
					</CardContent>
				</Card>
			) : (
				<Card className="overflow-hidden p-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>Name</TableHead>
								<TableHead className="w-20">Code</TableHead>
								<TableHead className="w-24">Currency</TableHead>
								<TableHead className="w-16">EU</TableHead>
								<TableHead className="w-24 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedCountries.map((country) => (
								<TableRow key={country.id}>
									<TableCell className="font-medium">{country.name}</TableCell>
									<TableCell>
										<Badge variant="outline" className="font-mono text-xs">
											{country.code}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge className="text-xs">{country.currency}</Badge>
									</TableCell>
									<TableCell>
										{country.euMember && (
											<Badge variant="secondary" className="text-xs">
												EU
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<EditCountryDialog country={country} />
											<DeleteCountryButton country={country} />
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
