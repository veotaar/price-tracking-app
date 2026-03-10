import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@web/components/app-sidebar";
import { TooltipProvider } from "@web/components/ui/tooltip";

export const Route = createFileRoute("/app")({
	beforeLoad: ({ context: { auth } }) => {
		if (!auth.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<TooltipProvider>
			<AppSidebar>
				<Outlet />
			</AppSidebar>
		</TooltipProvider>
	);
}
