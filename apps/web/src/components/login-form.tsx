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
import { signIn } from "@web/lib/auth-client";
import { cn } from "@web/lib/utils";
import { type } from "arktype";
import { TriangleAlertIcon } from "lucide-react";

import { Spinner } from "./ui/spinner";

const loginFormSchema = type({
	email: type("string.email").configure({
		message: () => "Invalid email address",
	}),
	password: type("16 <= string <= 128").configure({
		message: () => "Must be 16 to 128 characters",
	}),
});

export function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
	const navigate = useNavigate();
	// const redirect = useSearch({ from: "/login", select: (s) => s.redirect });

	const {
		mutate: login,
		isPending,
		error: loginError,
		reset: resetMutation,
	} = useMutation({
		mutationFn: async (value: typeof loginFormSchema.infer) => {
			const { data, error } = await signIn.email({
				email: value.email,
				password: value.password,
			});

			if (error) throw error;
			if (!data?.user) throw new Error("Login failed");

			return data;
		},
		onSuccess: async () => {
			await navigate({ to: "/app" });
		},
	});

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onChange: loginFormSchema,
			// onBlur: loginFormSchema,
			onSubmit: loginFormSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetMutation();
			login(value, {
				onError: () => {
					formApi.resetField("password");
				},
			});
		},
	});

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Enter your credentials to continue</CardDescription>
			</CardHeader>
			<CardContent>
				{loginError && (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>{loginError.message || "Login failed"}</AlertTitle>
						<AlertDescription>
							<p>Please verify your login information and try again.</p>
						</AlertDescription>
					</Alert>
				)}
			</CardContent>

			<CardContent>
				<form
					id="login-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
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
										<FieldDescription>Min 16 characters.</FieldDescription>
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
									form="login-form"
									className={cn(
										"hover:cursor-pointer hover:bg-primary/80",
										isPending && "cursor-not-allowed",
									)}
									disabled={isPending}
								>
									{isPending ? <Spinner className="size-4" /> : "Login"}
								</Button>
								<FieldDescription className="px-6 text-center">
									Don&apos;t have an account? <Link to="/signup">Sign up</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
