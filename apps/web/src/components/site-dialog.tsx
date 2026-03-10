import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	type CreateSiteInput,
	type UpdateSiteInput,
	useCreateSite,
	useUpdateSite,
} from "@web/api/sites";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@web/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { type } from "arktype";
import { PencilIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Spinner } from "./ui/spinner";

const strategyOptions = [
	{ value: "fetch", label: "Fetch" },
	{ value: "browser", label: "Browser" },
] as const;

const siteSchema = type({
	name: type("2 <= string <= 100").configure({
		message: () => "Must be 2 to 100 characters",
	}),
	hostname: type("3 <= string <= 255").configure({
		message: () => "Must be 3 to 255 characters",
	}),
	priceCssSelector: type("1 <= string <= 255").configure({
		message: () => "Price selector is required",
	}),
	priceDivisor: type("1 <= string <= 12").configure({
		message: () => "Price divisor is required",
	}),
	nameCssSelector: type("1 <= string <= 255").configure({
		message: () => "Name selector is required",
	}),
	strategy: type("5 <= string <= 7").configure({
		message: () => "Select a scraping strategy",
	}),
	countryId: type("string").configure({
		message: () => "Select a country",
	}),
});

type SiteDialogValues = {
	name: string;
	hostname: string;
	priceCssSelector: string;
	priceDivisor: string;
	nameCssSelector: string;
	strategy: string;
	countryId: string;
};

type CountryOption = {
	id: string;
	name: string;
	code: string;
	currency: string;
};

type SiteDialogProps = {
	mode: "create" | "edit";
	trigger: React.ReactElement;
	defaultValues: SiteDialogValues;
	title: string;
	description: string;
	submitLabel: string;
	countries: CountryOption[];
	siteId?: string;
};

type EditableSite = {
	id: string;
	name: string;
	hostname: string;
	priceCssSelector: string;
	priceDivisor: number;
	nameCssSelector: string;
	strategy: CreateSiteInput["strategy"];
	country: CountryOption;
};

function SiteDialog({
	mode,
	trigger,
	defaultValues,
	title,
	description,
	submitLabel,
	countries,
	siteId,
}: SiteDialogProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const {
		mutateAsync: createSite,
		isPending: isCreating,
		error: createError,
		reset: resetCreateMutation,
	} = useCreateSite();
	const {
		mutateAsync: updateSite,
		isPending: isUpdating,
		error: updateError,
		reset: resetUpdateMutation,
	} = useUpdateSite();
	const isPending = isCreating || isUpdating;
	const submitError = createError ?? updateError;

	const form = useForm({
		defaultValues,
		validators: {
			onChange: siteSchema,
			onSubmit: siteSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetCreateMutation();
			resetUpdateMutation();

			const parsedPriceDivisor = Number.parseInt(value.priceDivisor.trim(), 10);
			if (!Number.isInteger(parsedPriceDivisor) || parsedPriceDivisor <= 0) {
				return;
			}

			const payload = {
				name: value.name.trim(),
				hostname: value.hostname.trim(),
				priceCssSelector: value.priceCssSelector.trim(),
				priceDivisor: parsedPriceDivisor,
				nameCssSelector: value.nameCssSelector.trim(),
				strategy: value.strategy as CreateSiteInput["strategy"],
				countryId: value.countryId,
			};

			try {
				if (mode === "edit" && siteId) {
					await updateSite({
						siteId,
						...(payload as Omit<UpdateSiteInput, "siteId">),
					});
				} else {
					await createSite(payload);
				}

				await queryClient.invalidateQueries({ queryKey: ["sites"] });
				formApi.reset(defaultValues);
				setOpen(false);
			} catch {
				return;
			}
		},
	});

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);

		if (nextOpen) {
			form.reset(defaultValues);
			return;
		}

		resetCreateMutation();
		resetUpdateMutation();
		form.reset(defaultValues);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<form
				id={`${mode}-site-form${siteId ? `-${siteId}` : ""}`}
				onSubmit={(event) => {
					event.preventDefault();
					form.handleSubmit();
				}}
			>
				<DialogTrigger render={trigger} />
				<DialogContent className="gap-5 sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>

					{submitError && (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertTitle>
								{submitError.message || `Failed to ${mode} site`}
							</AlertTitle>
							<AlertDescription>
								Check the submitted values and try again. Hostnames must be
								unique.
							</AlertDescription>
						</Alert>
					)}

					<FieldGroup>
						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field
								name="name"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Site name</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Amazon Germany"
												required
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							<form.Field
								name="hostname"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Hostname</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="amazon.de"
												required
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field
								name="countryId"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor="site-country">Country</FieldLabel>
											<Select
												items={countries.map((country) => ({
													label: `${country.name} (${country.code})`,
													value: country.id,
												}))}
												value={field.state.value || null}
												onValueChange={(value) =>
													field.handleChange(value ?? "")
												}
											>
												<SelectTrigger
													id="site-country"
													onBlur={field.handleBlur}
													className="w-full"
													aria-invalid={isInvalid}
												>
													<SelectValue placeholder="Select country" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{countries.map((country) => (
															<SelectItem key={country.id} value={country.id}>
																<div className="flex w-full items-center justify-between gap-3">
																	<span>{country.name}</span>
																	<span className="text-muted-foreground text-xs">
																		{country.code} · {country.currency}
																	</span>
																</div>
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							<form.Field
								name="strategy"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor="site-strategy">Strategy</FieldLabel>
											<Select
												items={strategyOptions}
												value={field.state.value || null}
												onValueChange={(value) =>
													field.handleChange(value ?? "")
												}
											>
												<SelectTrigger
													id="site-strategy"
													onBlur={field.handleBlur}
													className="w-full"
													aria-invalid={isInvalid}
												>
													<SelectValue placeholder="Select strategy" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{strategyOptions.map((strategy) => (
															<SelectItem
																key={strategy.value}
																value={strategy.value}
															>
																{strategy.label}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>

											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field
								name="priceCssSelector"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Price selector
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="[data-price]"
												required
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							<form.Field
								name="priceDivisor"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Price divisor
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="number"
												inputMode="numeric"
												min={1}
												step={1}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="1"
												required
											/>

											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							<form.Field
								name="nameCssSelector"
								// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Name selector
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="h1"
												required
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>
						</div>
					</FieldGroup>

					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button
							type="submit"
							form={`${mode}-site-form${siteId ? `-${siteId}` : ""}`}
							disabled={isPending}
						>
							{isPending ? (
								<Spinner className="size-4" />
							) : mode === "edit" ? (
								<PencilIcon data-icon="inline-start" />
							) : (
								<PlusIcon data-icon="inline-start" />
							)}
							{submitLabel}
						</Button>
					</DialogFooter>
				</DialogContent>
			</form>
		</Dialog>
	);
}

export function AddSiteDialog({ countries }: { countries: CountryOption[] }) {
	return (
		<SiteDialog
			mode="create"
			trigger={
				<Button variant="outline">
					<PlusIcon data-icon="inline-start" />
					Add site
				</Button>
			}
			defaultValues={{
				name: "",
				hostname: "",
				priceCssSelector: "",
				priceDivisor: "1",
				nameCssSelector: "",
				strategy: "fetch",
				countryId: "",
			}}
			title="Add site"
			description="Define a site and its scraping selectors."
			submitLabel="Create site"
			countries={countries}
		/>
	);
}

export function EditSiteDialog({
	site,
	countries,
}: {
	site: EditableSite;
	countries: CountryOption[];
}) {
	return (
		<SiteDialog
			mode="edit"
			siteId={site.id}
			trigger={
				<Button variant="ghost" size="sm">
					<PencilIcon data-icon="inline-start" />
					Edit
				</Button>
			}
			defaultValues={{
				name: site.name,
				hostname: site.hostname,
				priceCssSelector: site.priceCssSelector,
				priceDivisor: String(site.priceDivisor),
				nameCssSelector: site.nameCssSelector,
				strategy: site.strategy,
				countryId: site.country.id,
			}}
			title={`Edit ${site.name}`}
			description="Update this site's configuration."
			submitLabel="Save changes"
			countries={countries}
		/>
	);
}
