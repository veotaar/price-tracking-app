import type { CurrencyCode } from "@api/modules/products/model";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ProductAnalyticsFilters,
	type ProductCurrentPricesResponse,
	type ProductDetailResponse,
	type ProductHistoryResponse,
	productCurrentPricesOptions,
	productHistoryOptions,
	productOptions,
	useProduct,
	useProductCurrentPrices,
	useProductHistory,
} from "@web/api/products";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import { Badge } from "@web/components/ui/badge";
import { Button, buttonVariants } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@web/components/ui/chart";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@web/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { Spinner } from "@web/components/ui/spinner";
import { currencyCodes } from "@web/lib/currencies";
import { cn } from "@web/lib/utils";
import {
	ArrowLeftIcon,
	ChartSplineIcon,
	CoinsIcon,
	ExternalLinkIcon,
	Globe2Icon,
	Package2Icon,
	RefreshCwIcon,
	StoreIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const INITIAL_DISPLAY_CURRENCY: CurrencyCode = "EUR";
const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"oklch(0.72 0.12 38)",
	"oklch(0.73 0.12 112)",
	"oklch(0.68 0.11 305)",
] as const;

type SelectableCountry = {
	code: string;
	name: string;
	currency: CurrencyCode;
	itemCount: number;
};

export const Route = createFileRoute("/app/product/$productId")({
	loader: async ({ context: { queryClient }, params }) => {
		const product = await queryClient.ensureQueryData(
			productOptions(params.productId),
		)
		const countries = getSelectableCountries(product);
		const defaultCountryCodes = countries.map((country) => country.code);
		const initialFilters = {
			currency: INITIAL_DISPLAY_CURRENCY,
			countryCodes: defaultCountryCodes,
		} satisfies ProductAnalyticsFilters;

		const [history, currentPrices] = defaultCountryCodes.length
			? await Promise.all([
					queryClient.ensureQueryData(
						productHistoryOptions(params.productId, initialFilters),
					),
					queryClient.ensureQueryData(
						productCurrentPricesOptions(params.productId, initialFilters),
					),
				])
			: [null, null];

		return {
			product,
			defaultCountryCodes,
			history,
			currentPrices,
		}
	},
	component: RouteComponent,
	errorComponent: () => (
		<div className="flex min-h-[40dvh] items-center justify-center">
			<Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle>Failed to load product</CardTitle>
					<CardDescription>
						The product view could not be prepared. Confirm the product exists
						and the API is reachable.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	),
});

function RouteComponent() {
	const { productId } = Route.useParams();
	const loaderData = Route.useLoaderData();
	const { data: product = loaderData.product } = useProduct(productId);
	const countries = useMemo(() => getSelectableCountries(product), [product]);
	const defaultCountryCodes = countries.map((country) => country.code);
	const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(
		INITIAL_DISPLAY_CURRENCY,
	)
	const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(
		loaderData.defaultCountryCodes,
	)

	const analyticsFilters = useMemo(
		() =>
			({
				currency: displayCurrency,
				countryCodes: selectedCountryCodes,
			}) satisfies ProductAnalyticsFilters,
		[displayCurrency, selectedCountryCodes],
	)

	const {
		data: historyData,
		error: historyError,
		isFetching: isHistoryFetching,
	} = useProductHistory(productId, analyticsFilters);
	const {
		data: currentPricesData,
		error: currentPricesError,
		isFetching: isCurrentPricesFetching,
	} = useProductCurrentPrices(productId, analyticsFilters);

	const isInitialFilters =
		displayCurrency === INITIAL_DISPLAY_CURRENCY &&
		areStringArraysEqual(selectedCountryCodes, loaderData.defaultCountryCodes);

	const history =
		historyData ??
		(isInitialFilters
			? ((loaderData.history ?? undefined) as
					| ProductHistoryResponse
					| undefined)
			: undefined);
	const currentPrices =
		currentPricesData ??
		(isInitialFilters
			? ((loaderData.currentPrices ?? undefined) as
					| ProductCurrentPricesResponse
					| undefined)
			: undefined);

	const selectedCountries = countries.filter((country) =>
		selectedCountryCodes.includes(country.code),
	)
	const chartConfig = useMemo(
		() => buildChartConfig(selectedCountries),
		[selectedCountries],
	)
	const chartData = useMemo(
		() => buildChartData(history?.series ?? []),
		[history?.series],
	)
	const showPointDots = chartData.length <= 1;
	const yAxisDomain = useMemo(
		() =>
			getYAxisDomain(
				chartData,
				selectedCountries.map((country) => country.code),
			),
		[chartData, selectedCountries],
	)
	const linkedItems = product.productItems.length;
	const linkedSites = new Set(
		product.productItems.map(({ item }) => item.site.id),
	).size;

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-primary/5 p-6">
				<div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_72%)] lg:block" />
				<div className="relative space-y-5">
					<Link
						to="/app/products"
						className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
					>
						<ArrowLeftIcon data-icon="inline-start" />
						Back to products
					</Link>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl space-y-3">
							<Badge variant="secondary" className="rounded-full px-3 py-1">
								Product view
							</Badge>
							<div className="space-y-2">
								<h1 className="font-semibold text-3xl tracking-tight">
									{product.name}
								</h1>
								<p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
									Compare the lowest historical price by country and inspect the
									latest tracked listings under one shared currency and country
									filter set.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 lg:justify-end">
							{countries.map((country) => (
								<Badge key={country.code} variant="outline">
									{country.code}
								</Badge>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<StatCard
					label="Linked items"
					value={linkedItems}
					icon={<Package2Icon className="size-5" />}
				/>
				<StatCard
					label="Tracked sites"
					value={linkedSites}
					icon={<StoreIcon className="size-5" />}
				/>
				<StatCard
					label="Visible markets"
					value={selectedCountries.length}
					icon={<Globe2Icon className="size-5" />}
				/>
			</section>

			<section>
				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							The selected countries and display currency are shared between the
							price history chart and the latest price list.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:items-end">
							<Field>
								<FieldLabel htmlFor="product-display-currency">
									Display currency
								</FieldLabel>
								<Select
									items={currencyCodes.map((currency) => ({
										label: currency,
										value: currency,
									}))}
									value={displayCurrency}
									onValueChange={(value) =>
										setDisplayCurrency(value as CurrencyCode)
									}
								>
									<SelectTrigger
										id="product-display-currency"
										className="w-full"
									>
										<SelectValue placeholder="Choose currency" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{currencyCodes.map((currency) => (
												<SelectItem key={currency} value={currency}>
													{currency}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>

							<Field>
								<FieldLabel>Countries</FieldLabel>
								<CountryFilterMenu
									countries={countries}
									selectedCountryCodes={selectedCountryCodes}
									onToggle={(countryCode) => {
										setSelectedCountryCodes((current) =>
											current.includes(countryCode)
												? current.filter((code) => code !== countryCode)
												: [...current, countryCode],
										)
									}}
									onSelectAll={() =>
										setSelectedCountryCodes(defaultCountryCodes)
									}
									onClear={() => setSelectedCountryCodes([])}
								/>
							</Field>

							<Button
								variant="outline"
								onClick={() => {
									setDisplayCurrency(INITIAL_DISPLAY_CURRENCY);
									setSelectedCountryCodes(defaultCountryCodes);
								}}
								disabled={
									displayCurrency === INITIAL_DISPLAY_CURRENCY &&
									areStringArraysEqual(
										selectedCountryCodes,
										defaultCountryCodes,
									)
								}
							>
								Reset filters
							</Button>
						</FieldGroup>
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Lowest Price Over Time</CardTitle>
								<CardDescription>
									One line per country, converted to {displayCurrency} using the
									historical exchange rate active at each price timestamp.
								</CardDescription>
							</div>
							{isHistoryFetching ? (
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<RefreshCwIcon className="size-4 animate-spin" />
									Refreshing history
								</div>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="space-y-4 p-4">
						{historyError ? (
							<Alert variant="destructive">
								<TriangleAlertIcon />
								<AlertTitle>Failed to load price history</AlertTitle>
								<AlertDescription>
									{historyError.message ||
										"The chart data could not be loaded."}
								</AlertDescription>
							</Alert>
						) : selectedCountryCodes.length === 0 ? (
							<EmptyStateCard
								title="No countries selected"
								description="Select at least one country to render the lowest-price history chart."
								icon={<ChartSplineIcon className="size-5" />}
							/>
						) : !history ||
							history.series.length === 0 ||
							chartData.length === 0 ? (
							<EmptyStateCard
								title="No price history yet"
								description="There are no historical prices for the selected countries and currency combination."
								icon={<ChartSplineIcon className="size-5" />}
							/>
						) : (
							<>
								<ChartContainer config={chartConfig} className="h-90 w-full">
									<LineChart
										accessibilityLayer
										data={chartData}
										margin={{ left: 12, right: 12, top: 12 }}
									>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="bucket"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											minTickGap={24}
											tickFormatter={(value) => formatShortDate(value)}
										/>
										<YAxis
											domain={yAxisDomain}
											width={96}
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tickFormatter={(value) =>
												formatCompactCurrency(Number(value), displayCurrency)
											}
										/>
										<ChartTooltip
											cursor={false}
											content={
												<ChartTooltipContent
													labelFormatter={(_, payload) =>
														formatLongDate(payload?.[0]?.payload?.bucket)
													}
													formatter={(value, name) => (
														<div className="flex min-w-40 items-center justify-between gap-4">
															<span className="text-muted-foreground">
																{chartConfig[String(name)]?.label ??
																	String(name)}
															</span>
															<span className="font-medium font-mono text-foreground tabular-nums">
																{formatCurrencyValue(
																	Number(value),
																	displayCurrency,
																)}
															</span>
														</div>
													)}
												/>
											}
										/>
										<ChartLegend content={<ChartLegendContent />} />
										{selectedCountries.map((country) => (
											<Line
												key={country.code}
												dataKey={country.code}
												type="monotone"
												stroke={`var(--color-${country.code})`}
												strokeWidth={2.25}
												dot={showPointDots ? { r: 4, strokeWidth: 0 } : false}
												activeDot={{ r: 5 }}
												connectNulls
											/>
										))}
									</LineChart>
								</ChartContainer>

								<div className="grid gap-3 rounded-xl border bg-muted/20 px-4 py-4 md:grid-cols-3">
									<MetricBlock
										label="Visible countries"
										value={String(selectedCountries.length)}
									/>
									<MetricBlock
										label="Display currency"
										value={displayCurrency}
									/>
									<MetricBlock
										label="Data points"
										value={String(
											history.series.reduce(
												(total, series) => total + series.data.length,
												0,
											),
										)}
									/>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="overflow-hidden pt-0">
					<CardHeader className="border-b bg-muted/30 py-5">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Current Prices</CardTitle>
								<CardDescription>
									Latest captured price for every item in the selected
									countries, shown in both the original and display currencies.
								</CardDescription>
							</div>
							{isCurrentPricesFetching ? (
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Spinner className="size-4" />
									Refreshing prices
								</div>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{currentPricesError ? (
							<div className="p-4">
								<Alert variant="destructive">
									<TriangleAlertIcon />
									<AlertTitle>Failed to load current prices</AlertTitle>
									<AlertDescription>
										{currentPricesError.message ||
											"The current price list could not be loaded."}
									</AlertDescription>
								</Alert>
							</div>
						) : selectedCountryCodes.length === 0 ? (
							<div className="p-4">
								<EmptyStateCard
									title="No countries selected"
									description="Select at least one country to inspect the latest item prices."
									icon={<CoinsIcon className="size-5" />}
								/>
							</div>
						) : !currentPrices || currentPrices.data.length === 0 ? (
							<div className="p-4">
								<EmptyStateCard
									title="No current prices found"
									description="There are no latest price snapshots for the selected countries right now."
									icon={<CoinsIcon className="size-5" />}
								/>
							</div>
						) : (
							<div className="divide-y">
								{currentPrices.data.map((row) => (
									<div
										key={row.itemId}
										className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/30 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_auto] xl:items-center"
									>
										<div className="min-w-0 space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate font-medium text-base">
													{row.itemName || row.itemUrl}
												</p>
												<Badge variant="outline">{row.countryCode}</Badge>
											</div>
											<p className="truncate text-muted-foreground text-sm">
												{row.itemUrl}
											</p>
										</div>

										<div className="space-y-2 rounded-lg border bg-background px-3 py-3">
											<p className="font-medium text-sm">{row.siteName}</p>
											<p className="text-muted-foreground text-sm">
												{row.countryName} · {row.countryCode}
											</p>
										</div>

										<div className="space-y-1 rounded-lg border bg-muted/20 px-3 py-3">
											<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
												Prices
											</p>
											<p className="font-medium text-sm">
												{formatCurrencyValue(
													row.convertedPrice,
													displayCurrency,
												)}
											</p>
											<p className="text-muted-foreground text-sm">
												Native:{" "}
												{formatCurrencyValue(
													row.originalPrice,
													row.originalCurrency,
												)}
											</p>
											<p className="text-muted-foreground text-xs">
												Updated {formatTimestamp(row.time)}
											</p>
										</div>

										<div className="flex items-center gap-2 xl:justify-end">
											<a
												href={row.itemUrl}
												target="_blank"
												rel="noreferrer"
												className={cn(
													buttonVariants({ variant: "outline", size: "sm" }),
												)}
											>
												<ExternalLinkIcon data-icon="inline-start" />
												Open listing
											</a>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	)
}

function CountryFilterMenu({
	countries,
	selectedCountryCodes,
	onToggle,
	onSelectAll,
	onClear,
}: {
	countries: SelectableCountry[];
	selectedCountryCodes: string[];
	onToggle: (countryCode: string) => void;
	onSelectAll: () => void;
	onClear: () => void;
}) {
	const selectedLabel =
		selectedCountryCodes.length === 0
			? "No countries"
			: selectedCountryCodes.length === countries.length
				? `All countries (${countries.length})`
				: `${selectedCountryCodes.length} countries selected`;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="outline" className="w-full justify-between" />}
			>
				<span className="truncate">{selectedLabel}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-72" align="start">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Visible countries</DropdownMenuLabel>
					<DropdownMenuItem onClick={onSelectAll}>Select all</DropdownMenuItem>
					<DropdownMenuItem onClick={onClear}>Clear selection</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{countries.map((country) => (
						<DropdownMenuCheckboxItem
							key={country.code}
							checked={selectedCountryCodes.includes(country.code)}
							onCheckedChange={() => onToggle(country.code)}
						>
							<div className="flex min-w-0 flex-1 items-center justify-between gap-4">
								<div className="min-w-0">
									<p className="truncate font-medium">{country.name}</p>
									<p className="truncate text-muted-foreground text-xs">
										{country.code} · {country.currency}
									</p>
								</div>
								<Badge variant="secondary">{country.itemCount}</Badge>
							</div>
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: ReactNode;
}) {
	return (
		<Card>
			<CardContent className="flex items-center justify-between gap-4 p-5">
				<div>
					<p className="text-muted-foreground text-sm">{label}</p>
					<p className="mt-1 font-semibold text-2xl tracking-tight">{value}</p>
				</div>
				<div className="rounded-full bg-primary/10 p-3 text-primary">
					{icon}
				</div>
			</CardContent>
		</Card>
	)
}

function MetricBlock({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
				{label}
			</p>
			<p className="mt-2 font-medium text-sm">{value}</p>
		</div>
	)
}

function EmptyStateCard({
	title,
	description,
	icon,
}: {
	title: string;
	description: string;
	icon: ReactNode;
}) {
	return (
		<div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
			<div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
				{icon}
			</div>
			<h3 className="font-medium text-lg">{title}</h3>
			<p className="mt-2 max-w-md text-muted-foreground text-sm">
				{description}
			</p>
		</div>
	)
}

function getSelectableCountries(
	product: ProductDetailResponse,
): SelectableCountry[] {
	const countries = new Map<string, SelectableCountry>();

	for (const { item } of product.productItems) {
		const existing = countries.get(item.site.country.code);

		if (existing) {
			existing.itemCount += 1;
			continue
		}

		countries.set(item.site.country.code, {
			code: item.site.country.code,
			name: item.site.country.name,
			currency: item.site.country.currency,
			itemCount: 1,
		})
	}

	return [...countries.values()].sort((left, right) =>
		left.name.localeCompare(right.name),
	)
}

function buildChartConfig(countries: SelectableCountry[]): ChartConfig {
	return countries.reduce<ChartConfig>((config, country, index) => {
		config[country.code] = {
			label: `${country.name} (${country.code})`,
			color: CHART_COLORS[index % CHART_COLORS.length],
		}

		return config;
	}, {});
}

function buildChartData(series: ProductHistoryResponse["series"]) {
	const pointsByBucket = new Map<string, Record<string, number | string>>();

	for (const countrySeries of series) {
		for (const point of countrySeries.data) {
			const existing = pointsByBucket.get(point.bucket) ?? {
				bucket: point.bucket,
			}
			existing[countrySeries.countryCode] = point.price;
			pointsByBucket.set(point.bucket, existing);
		}
	}

	return [...pointsByBucket.values()].sort((left, right) =>
		String(left.bucket).localeCompare(String(right.bucket)),
	)
}

function getYAxisDomain(
	chartData: Record<string, number | string>[],
	countryCodes: string[],
) {
	const values = chartData.flatMap((entry) =>
		countryCodes
			.map((countryCode) => entry[countryCode])
			.filter(
				(value): value is number =>
					typeof value === "number" && Number.isFinite(value),
			),
	)

	if (values.length === 0) {
		return [0, 1] as [number, number];
	}

	const minValue = Math.min(...values);
	const maxValue = Math.max(...values);
	const range = Math.max(maxValue - minValue, maxValue * 0.1, 0.25);
	const lowerPadding = range * 0.15;
	const upperPadding = range * 0.15;
	const domainMin = Math.max(0, minValue - lowerPadding);
	const domainMax = maxValue + upperPadding;

	return [
		roundAxisValue(domainMin, false),
		roundAxisValue(domainMax, true),
	] as [number, number];
}

function roundAxisValue(value: number, roundUp: boolean) {
	if (value <= 0) {
		return 0;
	}

	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step = magnitude >= 1 ? magnitude / 5 : magnitude / 2;
	const scaled = value / step;

	return (roundUp ? Math.ceil(scaled) : Math.floor(scaled)) * step;
}

function formatCurrencyValue(value: number, currency: CurrencyCode) {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatCompactCurrency(value: number, currency: CurrencyCode) {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}

function parseDateLike(value: unknown) {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === "string" || typeof value === "number") {
		const parsedDate = new Date(value);
		return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
	}

	return null;
}

function formatShortDate(value: unknown) {
	const parsedDate = parseDateLike(value);

	if (!parsedDate) {
		return typeof value === "string" ? value : "-";
	}

	const hasTimeComponent =
		parsedDate.getUTCHours() !== 0 ||
		parsedDate.getUTCMinutes() !== 0 ||
		parsedDate.getUTCSeconds() !== 0;

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		...(hasTimeComponent
			? {
					hour: "numeric",
					minute: "2-digit",
				}
			: {}),
	}).format(parsedDate);
}

function formatLongDate(value: unknown) {
	const parsedDate = parseDateLike(value);

	if (!parsedDate) {
		return typeof value === "string" ? value : "-";
	}

	const hasTimeComponent =
		parsedDate.getUTCHours() !== 0 ||
		parsedDate.getUTCMinutes() !== 0 ||
		parsedDate.getUTCSeconds() !== 0;

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		...(hasTimeComponent
			? {
					timeStyle: "short",
				}
			: {}),
	}).format(parsedDate);
}

function formatTimestamp(value: unknown) {
	const parsedDate = parseDateLike(value);

	if (!parsedDate) {
		return typeof value === "string" ? value : "-";
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(parsedDate);
}

function areStringArraysEqual(left: string[], right: string[]) {
	if (left.length !== right.length) {
		return false;
	}

	const leftSorted = [...left].sort();
	const rightSorted = [...right].sort();

	return leftSorted.every((value, index) => value === rightSorted[index]);
}
