import { useMutation } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@web/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { signOut } from "@web/lib/auth-client";
import { useTheme } from "@web/lib/theme-provider";
import { cn } from "@web/lib/utils";
import {
	BoxesIcon,
	Globe2Icon,
	Link2Icon,
	LogOutIcon,
	MenuIcon,
	MonitorIcon,
	MoonIcon,
	ServerIcon,
	SunIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

const navLinks = [
	{ to: "/app/countries", label: "Countries", icon: Globe2Icon },
	{ to: "/app/sites", label: "Sites", icon: ServerIcon },
	{ to: "/app/items", label: "Items", icon: Link2Icon },
	{ to: "/app/products", label: "Products", icon: BoxesIcon },
] as const;

function NavLink({
	to,
	label,
	icon: Icon,
	onClick,
}: {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	onClick?: () => void;
}) {
	const matchRoute = useMatchRoute();
	const isActive = matchRoute({ to, fuzzy: true });

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						to={to}
						onClick={onClick}
						className={cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
							isActive
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					/>
				}
			>
				<Icon className="size-4 shrink-0" />
				<span className="hidden lg:inline">{label}</span>
			</TooltipTrigger>
			<TooltipContent side="right" className="lg:hidden">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	const options = [
		{ value: "light" as const, icon: SunIcon, label: "Light" },
		{ value: "dark" as const, icon: MoonIcon, label: "Dark" },
		{ value: "system" as const, icon: MonitorIcon, label: "System" },
	];

	return (
		<div className="flex items-center gap-1 rounded-lg bg-muted p-1">
			{options.map(({ value, icon: Icon, label }) => (
				<Tooltip key={value}>
					<TooltipTrigger
						render={
							<button
								type="button"
								onClick={() => setTheme(value)}
								className={cn(
									"rounded-md p-1.5 transition-colors",
									theme === value
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							/>
						}
					>
						<Icon className="size-3.5" />
					</TooltipTrigger>
					<TooltipContent side="right" className="lg:hidden">
						{label}
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
	const navigate = useNavigate();

	const signOutMutation = useMutation({
		mutationFn: () => signOut(),
		onSuccess: () => navigate({ to: "/login" }),
	});

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="flex h-14 items-center gap-2.5 px-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<BoxesIcon className="size-4" />
				</div>
				<span className="hidden font-semibold text-sm tracking-tight lg:inline">
					Price Tracker
				</span>
			</div>

			{/* Navigation */}
			<nav className="flex flex-1 flex-col gap-1 px-2 pt-2">
				{navLinks.map((link) => (
					<NavLink key={link.to} {...link} onClick={onNavigate} />
				))}
			</nav>

			{/* Footer */}
			<div className="flex flex-col gap-2 border-border border-t px-2 py-3">
				<div className="self-start">
					<ThemeSwitcher />
				</div>
				<Tooltip>
					<TooltipTrigger
						render={
							<button
								type="button"
								onClick={() => signOutMutation.mutate()}
								disabled={signOutMutation.isPending}
								className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
							/>
						}
					>
						<LogOutIcon className="size-4 shrink-0" />
						<span className="hidden lg:inline">Sign out</span>
					</TooltipTrigger>
					<TooltipContent side="right" className="lg:hidden">
						Sign out
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

export function AppSidebar({ children }: { children: ReactNode }) {
	const [sheetOpen, setSheetOpen] = useState(false);

	return (
		<div className="flex min-h-dvh">
			{/* Mobile header */}
			<header className="fixed top-0 right-0 left-0 z-40 flex h-12 items-center gap-3 border-border border-b bg-background px-4 md:hidden">
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
						<MenuIcon className="size-4" />
					</SheetTrigger>
					<SheetContent side="left" className="w-60 p-0">
						<SheetHeader className="sr-only">
							<SheetTitle>Navigation</SheetTitle>
						</SheetHeader>
						<SidebarContent onNavigate={() => setSheetOpen(false)} />
					</SheetContent>
				</Sheet>
				<span className="font-semibold text-sm tracking-tight">
					PriceTracker
				</span>
			</header>

			{/* Desktop sidebar */}
			<aside className="fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-border border-r bg-sidebar md:flex md:w-14 lg:w-56">
				<SidebarContent />
			</aside>

			{/* Main content */}
			<main className="mt-12 flex-1 md:mt-0 md:ml-14 lg:ml-56">
				<div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
			</main>
		</div>
	);
}
