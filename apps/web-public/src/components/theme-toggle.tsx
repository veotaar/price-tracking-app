import { useTheme } from "@web-public/components/theme-provider";
import { Button } from "@web-public/components/ui/button";
import { Kbd } from "@web-public/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-public/components/ui/tooltip";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const toggle = () => {
		if (theme === "dark") {
			setTheme("light");
		} else if (theme === "light") {
			setTheme("dark");
		} else {
			const systemIsDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setTheme(systemIsDark ? "light" : "dark");
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							onClick={toggle}
							aria-label="Toggle theme"
						/>
					}
				>
					<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				</TooltipTrigger>
				<TooltipContent>
					Toggle Mode
					<Kbd>D</Kbd>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
