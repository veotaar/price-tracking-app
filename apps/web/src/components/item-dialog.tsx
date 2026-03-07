import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateItem } from "@web/api/items";
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
	FieldDescription,
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
import { Link2Icon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Spinner } from "./ui/spinner";

const itemSchema = type({
	siteId: type("string").configure({
		message: () => "Select a site",
	}),
	url: type("string.url").configure({
		message: () => "Enter a valid item URL",
	}),
	name: "string",
});

type SiteOption = {
	id: string;
	name: string;
	hostname: string;
	country: {
		code: string;
		currency: string;
	};
};

export function AddItemDialog({ sites }: { sites: SiteOption[] }) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { mutateAsync: createItem, isPending, error, reset } = useCreateItem();

	const form = useForm({
		defaultValues: {
			siteId: "",
			url: "",
			name: "",
		},
		validators: {
			onChange: itemSchema,
			onSubmit: itemSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			reset();

			try {
				await createItem({
					siteId: value.siteId,
					url: value.url.trim(),
					...(value.name.trim() ? { name: value.name.trim() } : {}),
				});

				await queryClient.invalidateQueries({ queryKey: ["items"] });
				formApi.reset();
				setOpen(false);
			} catch {
				return;
			}
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					reset();
					form.reset();
				}
			}}
		>
			<form
				id="create-item-form"
				onSubmit={(event) => {
					event.preventDefault();
					form.handleSubmit();
				}}
			>
				<DialogTrigger render={<Button variant="outline" />}>
					<PlusIcon data-icon="inline-start" />
					Add item
				</DialogTrigger>
				<DialogContent className="gap-5 sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Add item</DialogTitle>
						<DialogDescription>
							Register an item URL so the scheduler can start tracking prices on
							a specific site.
						</DialogDescription>
					</DialogHeader>

					{error && (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertTitle>
								{error.message || "Failed to create item"}
							</AlertTitle>
							<AlertDescription>
								Check the URL and site selection, then try again.
							</AlertDescription>
						</Alert>
					)}

					<FieldGroup>
						<form.Field
							name="siteId"
							// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="item-site">Site</FieldLabel>
										<Select
											items={sites.map((site) => ({
												label: site.name,
												value: site.id,
											}))}
											value={field.state.value || null}
											onValueChange={(value) => field.handleChange(value ?? "")}
										>
											<SelectTrigger
												id="item-site"
												onBlur={field.handleBlur}
												className="w-full"
												aria-invalid={isInvalid}
											>
												<SelectValue placeholder="Select site" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{sites.map((site) => (
														<SelectItem key={site.id} value={site.id}>
															<div className="flex w-full items-center justify-between gap-3">
																<span>{site.name}</span>
																<span className="text-muted-foreground text-xs">
																	{site.hostname} · {site.country.code}
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
							name="url"
							// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Item URL</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="url"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="https://www.amazon.de/dp/..."
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
							name="name"
							// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
							children={(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>Display name</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Optional label from the listing"
									/>
									<FieldDescription>
										You can leave this empty and let the scraper populate it
										later.
									</FieldDescription>
								</Field>
							)}
						/>

						<div className="rounded-xl border bg-muted/30 p-4">
							<div className="flex items-start gap-3">
								<div className="rounded-lg bg-primary/10 p-2 text-primary">
									<Link2Icon className="size-4" />
								</div>
								<div className="space-y-1">
									<p className="font-medium text-sm">Tracking behavior</p>
									<p className="text-muted-foreground text-sm">
										New items are scheduled for scraping after creation, so
										submit the final canonical product URL rather than a search
										or redirect URL.
									</p>
								</div>
							</div>
						</div>
					</FieldGroup>

					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button type="submit" form="create-item-form" disabled={isPending}>
							{isPending ? (
								<Spinner className="size-4" />
							) : (
								<PlusIcon data-icon="inline-start" />
							)}
							Create item
						</Button>
					</DialogFooter>
				</DialogContent>
			</form>
		</Dialog>
	);
}
