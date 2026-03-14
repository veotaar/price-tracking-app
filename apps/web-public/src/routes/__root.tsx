import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeToggle } from "@web-public/components/theme-toggle";
import { buttonVariants } from "@web-public/components/ui/button";
import { cn } from "@web-public/lib/utils";

type RootRouteContext = {
	queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RootRouteContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<div className="min-h-dvh bg-background">
				<header className="border-border/60 border-b bg-background/75 backdrop-blur-sm">
					<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
						<Link to="/" className="font-semibold text-lg tracking-tight">
							Price Tracker
						</Link>
						<nav className="flex items-center gap-1">
							<Link
								to="/"
								className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
							>
								Catalog
							</Link>
							<Link
								to="/about"
								className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
							>
								About
							</Link>
							<ThemeToggle />
						</nav>
					</div>
				</header>
				<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
					<Outlet />
				</main>
				<footer className="mx-auto max-w-5xl px-4 pb-8 text-muted-foreground text-xs sm:px-6 lg:px-8">
					<p>Price Tracker | Compare prices across markets.</p>
				</footer>
			</div>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools buttonPosition="top-right" position="top" />
		</>
	);
}
