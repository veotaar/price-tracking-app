import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@web/lib/auth-context";
import { ThemeProvider } from "@web/lib/theme-provider";

import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		// biome-ignore lint: r
		auth: undefined!,
		queryClient,
	},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultViewTransition: false,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const InnerApp = () => {
	const auth = useAuth();
	return <RouterProvider router={router} context={{ auth }} />;
	// return <RouterProvider router={router} />;
};

const App = () => (
	<QueryClientProvider client={queryClient}>
		<AuthProvider>
			<ThemeProvider>
				<InnerApp />
			</ThemeProvider>
		</AuthProvider>
	</QueryClientProvider>
);

export default App;
