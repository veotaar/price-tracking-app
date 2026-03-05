import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { ModeToggle } from "@web/components/mode-toggle";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@web/components/ui/navigation-menu";

export const Route = createFileRoute("/app")({
	beforeLoad: ({ context: { auth } }) => {
		if (!auth.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: RouteComponent,
});

const navLinks = [
	{ to: "/app/countries", label: "Countries" },
	{ to: "/app/sites", label: "Sites" },
	{ to: "/app/items", label: "Items" },
	{ to: "/app/products", label: "Products" },
] as const;

function RouteComponent() {
	return (
		<div>
			<div className="flex justify-center pt-4">
				<NavigationMenu>
					<NavigationMenuList>
						{navLinks.map(({ to, label }) => (
							<NavigationMenuItem key={to}>
								<NavigationMenuLink
									render={<Link to={to} />}
									className={navigationMenuTriggerStyle()}
								>
									{label}
								</NavigationMenuLink>
							</NavigationMenuItem>
						))}
						<NavigationMenuItem>
							<ModeToggle />
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>

			<div className="m-4 min-h-dvh rounded-md border p-4">
				<Outlet />
			</div>
		</div>
	);
}
