import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignupForm } from "@web/components/signup-form";
import { type } from "arktype";

const signupSearchSchema = type({
	redirect: "string = '/'",
});

export const Route = createFileRoute("/signup")({
	validateSearch: signupSearchSchema,
	beforeLoad: ({ search, context: { auth } }) => {
		if (auth.isAuthenticated) {
			throw redirect({ to: search.redirect });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<SignupForm />
			</div>
		</div>
	);
}
