import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@web-public/components/ui/button";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-svh flex-col items-center justify-center gap-6">
			<div className="text-center">
				<h1 className="font-semibold text-3xl tracking-tight">Price Tracker</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Welcome to the demo
				</p>
			</div>
			<div className="flex gap-2">
				<Link to="/about">
					<Button variant="outline">About</Button>
				</Link>
			</div>
		</div>
	);
}
