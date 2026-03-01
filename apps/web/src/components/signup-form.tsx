import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { Spinner } from "@web/components/ui/spinner";
import { signUp } from "@web/lib/auth-client";
import { cn } from "@web/lib/utils";
import { type } from "arktype";
import { TriangleAlertIcon } from "lucide-react";

const signupFormSchema = type({
	name: type("string > 0").configure({ message: () => "Name is required" }),
	email: type("string.email").configure({
		message: () => "Invalid email address",
	}),
	password: type("16 <= string <= 128").configure({
		message: () => "Must be 16 to 128 characters",
	}),
	confirmPassword: type("16 <= string <= 128").configure({
		message: () => "Must be 16 to 128 characters",
	}),
}).narrow((data, ctx) => {
	if (data.password !== data.confirmPassword) {
		return ctx.reject({
			message: "Passwords do not match",
			path: ["confirmPassword"],
		});
	}
	return true;
});

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
	const navigate = useNavigate();

	const {
		mutate: signup,
		isPending,
		error: signupError,
		reset: resetMutation,
	} = useMutation({
		mutationFn: async (value: typeof signupFormSchema.infer) => {
			const { data, error } = await signUp.email({
				name: value.name,
				email: value.email,
				password: value.password,
			});

			if (error) throw error;
			if (!data?.user) throw new Error("Signup failed");

			return data;
		},
		onSuccess: async () => {
			await navigate({ to: "/" });
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onChange: signupFormSchema,
			// onBlur: signupFormSchema,
			onSubmit: signupFormSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetMutation();
			signup(value, {
				onError: () => {
					formApi.resetField("password");
					formApi.resetField("confirmPassword");
				},
			});
		},
	});

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>
					Enter your information below to create your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				{signupError && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>{signupError.message || "Signup failed"}</AlertTitle>
						<AlertDescription>
							<p>Please verify your information and try again.</p>
						</AlertDescription>
					</Alert>
				)}
			</CardContent>

			<CardContent>
				<form
					id="sign-up-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="name"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Name</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Your Name"
											autoComplete="off"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<form.Field
							name="email"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Email</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="m@example.com"
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
							name="password"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Password</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
										/>
										<FieldDescription>
											Must be at least 16 characters long.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<form.Field
							name="confirmPassword"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Confirm Password
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
										/>
										<FieldDescription>
											Please confirm your password.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<FieldGroup>
							<Field>
								<Button
									type="submit"
									form="sign-up-form"
									className={cn(
										"hover:cursor-pointer hover:bg-primary/80",
										isPending && "cursor-not-allowed",
									)}
									disabled={isPending}
								>
									{isPending ? (
										<Spinner className="size-4" />
									) : (
										"Create Account"
									)}
								</Button>
								<FieldDescription className="px-6 text-center">
									Already have an account? <Link to="/login">Log in</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
