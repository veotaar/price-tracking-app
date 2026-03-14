import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@web-public/components/ui/card";
import {
	BarChart3Icon,
	CoinsIcon,
	GlobeIcon,
	TrendingDownIcon,
} from "lucide-react";

export const Route = createFileRoute("/about")({
	component: About,
});

const features = [
	{
		icon: GlobeIcon,
		title: "Country comparison",
		description:
			"See how the same product is priced across different countries and stores.",
	},
	{
		icon: TrendingDownIcon,
		title: "Price history",
		description:
			"View historical price charts to spot trends and find the right time to buy.",
	},
	{
		icon: CoinsIcon,
		title: "Multi-currency",
		description:
			"Switch between currencies to compare prices in the unit that makes sense to you.",
	},
	{
		icon: BarChart3Icon,
		title: "Visual analytics",
		description:
			"Interactive charts and tables make it easy to understand pricing at a glance.",
	},
];

function About() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
					About Price Tracker
				</h1>
				<p className="mt-2 max-w-2xl text-muted-foreground sm:text-lg">
					A simple tool for comparing product prices across countries and
					stores.
				</p>
			</div>

			<Card className="border">
				<CardHeader>
					<CardTitle>How it works</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-muted-foreground text-sm">
					<p>
						Price Tracker monitors product prices from online stores in multiple
						countries. Prices are checked daily, converted to a common currency
						using daily exchange rates, and displayed as interactive charts so
						you can compare markets and spot trends over time.
					</p>
				</CardContent>
			</Card>

			<div className="grid gap-4 sm:grid-cols-2">
				{features.map((feature) => (
					<Card className="border" key={feature.title}>
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<feature.icon className="size-5" />
								</div>
								<CardTitle className="text-base">{feature.title}</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								{feature.description}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
