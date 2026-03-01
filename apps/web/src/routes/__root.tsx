import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { AuthContextType } from "@web/lib/auth-context";

type RootRouteContext = {
	queryClient: QueryClient;
	auth: AuthContextType;
};

export const Route = createRootRouteWithContext<RootRouteContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<Outlet />
			<TanStackRouterDevtools />
			<ReactQueryDevtools buttonPosition="top-right" position="top" />
			<TanStackDevtools plugins={[formDevtoolsPlugin()]} />
		</>
	);
}
