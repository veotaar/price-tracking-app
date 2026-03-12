import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	type CreateProductInput,
	type UpdateProductInput,
	useCreateProduct,
	useUpdateProduct,
} from "@web/api/products";
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
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { Switch } from "@web/components/ui/switch";
import { type } from "arktype";
import { PencilIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Spinner } from "./ui/spinner";

const productSchema = type({
	name: type("2 <= string <= 160").configure({
		message: () => "Must be 2 to 160 characters",
	}),
	published: "boolean",
});

type ProductDialogValues = {
	name: string;
	published: boolean;
};

type ProductDialogProps = {
	mode: "create" | "edit";
	trigger: React.ReactElement;
	defaultValues: ProductDialogValues;
	title: string;
	description: string;
	submitLabel: string;
	productId?: string;
};

type EditableProduct = {
	id: string;
	name: string;
	published: boolean;
};

function ProductDialog({
	mode,
	trigger,
	defaultValues,
	title,
	description,
	submitLabel,
	productId,
}: ProductDialogProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const {
		mutateAsync: createProduct,
		isPending: isCreating,
		error: createError,
		reset: resetCreateMutation,
	} = useCreateProduct();
	const {
		mutateAsync: updateProduct,
		isPending: isUpdating,
		error: updateError,
		reset: resetUpdateMutation,
	} = useUpdateProduct();
	const isPending = isCreating || isUpdating;
	const submitError = createError ?? updateError;

	const form = useForm({
		defaultValues,
		validators: {
			onChange: productSchema,
			onSubmit: productSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetCreateMutation();
			resetUpdateMutation();

			const payload = {
				name: value.name.trim(),
				published: value.published,
			};

			try {
				if (mode === "edit" && productId) {
					await updateProduct({
						productId,
						...(payload as Omit<UpdateProductInput, "productId">),
					});
				} else {
					await createProduct(payload as CreateProductInput);
				}

				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ["products"] }),
					productId
						? queryClient.invalidateQueries({
								queryKey: ["product", productId],
							})
						: Promise.resolve(),
				]);

				formApi.reset(defaultValues);
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
					resetCreateMutation();
					resetUpdateMutation();
					form.reset(defaultValues);
				} else {
					form.reset(defaultValues);
				}
			}}
		>
			<form
				id={`${mode}-product-form${productId ? `-${productId}` : ""}`}
				onSubmit={(event) => {
					event.preventDefault();
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
								{submitError.message || `Failed to ${mode} product`}
							</AlertTitle>
							<AlertDescription>
								Check the product name and try again.
							</AlertDescription>
						</Alert>
					)}

					<FieldGroup>
						<form.Field
							name="name"
							// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Product name</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Nintendo Switch OLED"
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
							name="published"
							// biome-ignore lint/correctness/noChildrenProp: tanstack form render prop
							children={(field) => (
								<Field orientation="horizontal">
									<FieldLabel htmlFor={field.name}>
										<Switch
											id={field.name}
											name={field.name}
											checked={field.state.value}
											onCheckedChange={field.handleChange}
										/>
										<FieldContent>
											<FieldTitle>Published</FieldTitle>
											<FieldDescription>
												Published products are ready to be shown publicly.
											</FieldDescription>
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
							form={`${mode}-product-form${productId ? `-${productId}` : ""}`}
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

export function AddProductDialog() {
	return (
		<ProductDialog
			mode="create"
			trigger={
				<Button variant="outline">
					<PlusIcon data-icon="inline-start" />
					Add product
				</Button>
			}
			defaultValues={{ name: "", published: false }}
			title="Add product"
			description="Create a product to group items across sites and control when it is published."
			submitLabel="Create product"
		/>
	);
}

export function EditProductDialog({ product }: { product: EditableProduct }) {
	return (
		<ProductDialog
			mode="edit"
			productId={product.id}
			trigger={
				<Button variant="ghost" size="sm">
					<PencilIcon data-icon="inline-start" />
					Edit
				</Button>
			}
			defaultValues={{ name: product.name, published: product.published }}
			title={`Edit ${product.name}`}
			description="Update the product name and publication state."
			submitLabel="Save changes"
		/>
	);
}
