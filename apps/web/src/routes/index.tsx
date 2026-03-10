import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import { Spinner } from "@web/components/ui/spinner";
import { signOut } from "@web/lib/auth-client";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { auth } = Route.useRouteContext();
	const navigate = useNavigate();

	const signOutMutation = useMutation({
		mutationFn: async () => {
			const { error } = await signOut();
			if (error) throw error;
		},
		onSuccess: async () => {
			await navigate({ to: "/login", search: { redirect: "/" } });
		},
	});

	if (auth.isPending) {
		return (
			<div className="flex h-svh items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (auth.isAuthenticated) {
		return (
			<div className="flex h-svh flex-col items-center justify-center gap-4">
				<h1 className="font-semibold text-2xl tracking-tight">Price Tracker</h1>
				<p className="text-muted-foreground text-sm">
					Signed in as {auth.user?.name || auth.user?.email}
				</p>
				<div className="flex gap-2">
					<Link to="/app">
						<Button size="sm">Open App</Button>
					</Link>
					<Button
						onClick={() => signOutMutation.mutateAsync()}
						variant="ghost"
						size="sm"
						disabled={signOutMutation.isPending}
					>
						{signOutMutation.isPending ? (
							<Spinner className="size-4" />
						) : (
							"Sign Out"
						)}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-svh flex-col items-center justify-center gap-6">
			<div className="text-center">
				<h1 className="font-semibold text-3xl tracking-tight">Price Tracker</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Monitor prices across markets
				</p>
			</div>
			<div className="flex gap-2">
				<Link to="/login">
					<Button>Sign In</Button>
				</Link>
				<Link to="/signup">
					<Button variant="outline">Sign Up</Button>
				</Link>
			</div>
		</div>
	);
}
