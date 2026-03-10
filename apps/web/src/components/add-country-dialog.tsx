import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	type CreateCountryInput,
	countriesOptions,
	type UpdateCountryInput,
	useCreateCountry,
	useUpdateCountry,
} from "@web/api/countries";
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
	FieldContent,
	// FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
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

export const createCountrySchema = type({
	name: type("2 <= string <= 80").configure({
		message: () => "Must be 2 to 80 characters",
	}),
	code: type("2 <= string <= 2").configure({
		message: () => "Use a 2-letter country code",
	}),
	currency: type("3 <= string <= 3").configure({
		message: () => "Select a 3-letter currency code",
	}),
	euMember: "boolean",
});

const currencyOptions = [
	{ value: "EUR", label: "EUR" },
	{ value: "GBP", label: "GBP" },
	{ value: "SEK", label: "SEK" },
	{ value: "NOK", label: "NOK" },
	{ value: "PLN", label: "PLN" },
	{ value: "TRY", label: "TRY" },
	{ value: "CZK", label: "CZK" },
	{ value: "CHF", label: "CHF" },
	{ value: "DKK", label: "DKK" },
	{ value: "HUF", label: "HUF" },
	{ value: "RON", label: "RON" },
	{ value: "AED", label: "AED" },
	{ value: "QAR", label: "QAR" },
	{ value: "KWD", label: "KWD" },
	{ value: "SGD", label: "SGD" },
	{ value: "JPY", label: "JPY" },
	{ value: "KRW", label: "KRW" },
	{ value: "INR", label: "INR" },
	{ value: "MYR", label: "MYR" },
	{ value: "THB", label: "THB" },
	{ value: "PHP", label: "PHP" },
	{ value: "HKD", label: "HKD" },
	{ value: "TWD", label: "TWD" },
	{ value: "AUD", label: "AUD" },
	{ value: "NZD", label: "NZD" },
	{ value: "USD", label: "USD" },
	{ value: "CAD", label: "CAD" },
	{ value: "MXN", label: "MXN" },
	{ value: "BRL", label: "BRL" },
	{ value: "ARS", label: "ARS" },
	{ value: "CLP", label: "CLP" },
	{ value: "COP", label: "COP" },
] as const;

type CountryDialogValues = {
	name: string;
	code: string;
	currency: string;
	euMember: boolean;
};

type CountryDialogProps = {
	mode: "create" | "edit";
	trigger: React.ReactElement;
	defaultValues: CountryDialogValues;
	title: string;
	description: string;
	submitLabel: string;
	countryId?: string;
};

type EditableCountry = {
	id: string;
	name: string;
	code: string;
	currency: CreateCountryInput["currency"];
	euMember: boolean;
};

function CountryDialog({
	mode,
	trigger,
	defaultValues,
	title,
	description,
	submitLabel,
	countryId,
}: CountryDialogProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const {
		mutateAsync: createCountry,
		isPending: isCreating,
		error: createError,
		reset: resetCreateMutation,
	} = useCreateCountry();
	const {
		mutateAsync: updateCountry,
		isPending: isUpdating,
		error: updateError,
		reset: resetUpdateMutation,
	} = useUpdateCountry();
	const isPending = isCreating || isUpdating;
	const submitError = createError ?? updateError;

	const form = useForm({
		defaultValues,
		validators: {
			onChange: createCountrySchema,
			onSubmit: createCountrySchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetCreateMutation();
			resetUpdateMutation();

			const payload = {
				name: value.name.trim(),
				code: value.code.trim().toUpperCase(),
				currency: value.currency
					.trim()
					.toUpperCase() as CreateCountryInput["currency"],
				euMember: value.euMember,
			};

			try {
				if (mode === "edit" && countryId) {
					await updateCountry({
						countryId,
						...(payload as Omit<UpdateCountryInput, "countryId">),
					});
				} else {
					await createCountry(payload);
				}

				await queryClient.invalidateQueries({
					queryKey: countriesOptions().queryKey,
				});

				formApi.reset();
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
				id={`${mode}-country-form${countryId ? `-${countryId}` : ""}`}
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<DialogTrigger render={trigger} />
				<DialogContent className="gap-5 sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>

					{submitError && (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertTitle>
								{submitError.message || `Failed to ${mode} country`}
							</AlertTitle>
							<AlertDescription>
								Check the values and try again. Names and codes must be unique.
							</AlertDescription>
						</Alert>
					)}

					<FieldGroup>
						<div className="grid gap-4 sm:grid-cols-[1.7fr_1fr]">
							<form.Field
								name="name"
								// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Country name</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Germany"
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
								name="code"
								// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Country code</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value.replace(/\s+/g, "").toUpperCase(),
													)
												}
												placeholder="DE"
												autoCapitalize="characters"
												maxLength={2}
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

						<form.Field
							name="currency"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="country-currency">Currency</FieldLabel>
										<Select
											items={currencyOptions}
											value={field.state.value || null}
											onValueChange={(value) => field.handleChange(value ?? "")}
										>
											<SelectTrigger
												id="country-currency"
												onBlur={field.handleBlur}
												className="w-full"
												aria-invalid={isInvalid}
											>
												<SelectValue placeholder="Select currency" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{currencyOptions.map((currency) => (
														<SelectItem
															key={currency.value}
															value={currency.value}
														>
															<div className="flex w-full items-center justify-between gap-3">
																<span>{currency.label}</span>
																<span className="text-muted-foreground text-xs">
																	{currency.value === "USD"
																		? "US Dollar"
																		: currency.value === "EUR"
																			? "Euro"
																			: currency.value === "GBP"
																				? "Pound Sterling"
																				: "Market currency"}
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
							name="euMember"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => (
								<Field orientation="horizontal">
									<FieldLabel htmlFor="country-eu-member">
										<input
											id="country-eu-member"
											type="checkbox"
											checked={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.checked)
											}
											className="mt-0.5 size-4 rounded border-input accent-primary"
										/>
										<FieldContent>
											<FieldTitle>EU member</FieldTitle>
											{/* <FieldDescription>EU membership.</FieldDescription> */}
										</FieldContent>
									</FieldLabel>
								</Field>
							)}
						/>
					</FieldGroup>
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button
							type="submit"
							form={`${mode}-country-form${countryId ? `-${countryId}` : ""}`}
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

export function AddCountryDialog() {
	return (
		<CountryDialog
			mode="create"
			trigger={
				<Button variant="outline">
					<PlusIcon data-icon="inline-start" />
					Add country
				</Button>
			}
			defaultValues={{
				name: "",
				code: "",
				currency: "",
				euMember: true,
			}}
			title="Add country"
			description="Add a country with its code and currency."
			submitLabel="Create country"
		/>
	);
}

export function EditCountryDialog({ country }: { country: EditableCountry }) {
	return (
		<CountryDialog
			mode="edit"
			countryId={country.id}
			trigger={
				<Button variant="ghost" size="sm">
					<PencilIcon data-icon="inline-start" />
					Edit
				</Button>
			}
			defaultValues={{
				name: country.name,
				code: country.code,
				currency: country.currency,
				euMember: country.euMember,
			}}
			title={`Edit ${country.name}`}
			description="Update this country's details."
			submitLabel="Save changes"
		/>
	);
}
