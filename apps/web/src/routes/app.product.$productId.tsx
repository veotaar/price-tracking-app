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
import { PageHeader } from "@web/components/page-header";
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { Spinner } from "@web/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import { getCountryChartTheme } from "@web/lib/chart-colors";
import { currencyCodes } from "@web/lib/currencies";
import { cn } from "@web/lib/utils";
import {
	ArrowLeftIcon,
	ChartSplineIcon,
	CoinsIcon,
	ExternalLinkIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const INITIAL_DISPLAY_CURRENCY: CurrencyCode = "EUR";
const EU_AVERAGE_SERIES_KEY = "EU_AVG";
const EU_AVERAGE_SERIES_NAME = "EU Average";
const EU_AVERAGE_THEME = {
	light: "oklch(0.3665 0.2103 268.66)",
	dark: "oklch(0.497 0.2103 268.66)",
} as const;

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
		);
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
		};
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
	);
	const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(
		loaderData.defaultCountryCodes,
	);
	const [includeEuAverage, setIncludeEuAverage] = useState(false);

	const analyticsFilters = useMemo(
		() =>
			({
				currency: displayCurrency,
				countryCodes: selectedCountryCodes,
				includeEuAverage,
			}) satisfies ProductAnalyticsFilters,
		[displayCurrency, includeEuAverage, selectedCountryCodes],
	);

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
		includeEuAverage === false &&
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
	);
	const chartSeries = history?.series ?? [];
	const chartConfig = useMemo(
		() => buildChartConfig(chartSeries),
		[chartSeries],
	);
	const chartData = useMemo(() => buildChartData(chartSeries), [chartSeries]);
	// const showPointDots = chartData.length <= 1;
	const showPointDots = true;

	const yAxisDomain = useMemo(
		() =>
			getYAxisDomain(
				chartData,
				chartSeries.map((series) => series.countryCode),
			),
		[chartData, chartSeries],
	);
	const visibleChartSeriesCount = chartSeries.length;
	const linkedItems = product.productItems.length;
	const linkedSites = new Set(
		product.productItems.map(({ item }) => item.site.id),
	).size;

	return (
		<div className="space-y-6">
			<div>
				<Link
					to="/app/products"
					className={cn(
						buttonVariants({ variant: "ghost", size: "sm" }),
						"mb-2 -ml-2",
					)}
				>
					<ArrowLeftIcon data-icon="inline-start" />
					Products
				</Link>
				<PageHeader
					title={product.name}
					description={`${linkedItems} items · ${linkedSites} sites · ${selectedCountries.length} markets · ${displayCurrency}`}
					actions={
						<div className="flex flex-wrap gap-1">
							{countries.map((country) => (
								<Badge key={country.code} variant="outline">
									{country.code}
								</Badge>
							))}
						</div>
					}
				/>
			</div>

			{/* Filters toolbar */}
			<div className="flex flex-wrap items-end gap-3">
				<Select
					items={currencyCodes.map((c) => ({ label: c, value: c }))}
					value={displayCurrency}
					onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}
				>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="Currency" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{currencyCodes.map((c) => (
								<SelectItem key={c} value={c}>
									{c}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<CountryFilterMenu
					countries={countries}
					selectedCountryCodes={selectedCountryCodes}
					onToggle={(countryCode) => {
						setSelectedCountryCodes((current) =>
							current.includes(countryCode)
								? current.filter((code) => code !== countryCode)
								: [...current, countryCode],
						);
					}}
					onSelectAll={() => setSelectedCountryCodes(defaultCountryCodes)}
					onClear={() => setSelectedCountryCodes([])}
				/>

				<label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
					<input
						type="checkbox"
						checked={includeEuAverage}
						onChange={(e) => setIncludeEuAverage(e.target.checked)}
						className="size-3.5 rounded border-input accent-primary"
					/>
					EU average
				</label>

				{!isInitialFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setDisplayCurrency(INITIAL_DISPLAY_CURRENCY);
							setSelectedCountryCodes(defaultCountryCodes);
							setIncludeEuAverage(false);
						}}
					>
						<RotateCcwIcon data-icon="inline-start" />
						Reset
					</Button>
				)}
			</div>

			{/* Price history chart */}
			<Card className="overflow-hidden pt-0">
				<CardHeader className="border-b py-4">
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="text-base">Lowest Price Over Time</CardTitle>
						{isHistoryFetching && (
							<RefreshCwIcon className="size-4 animate-spin text-muted-foreground" />
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4 p-4">
					{historyError ? (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertTitle>Failed to load price history</AlertTitle>
							<AlertDescription>
								{historyError.message || "Chart data could not be loaded."}
							</AlertDescription>
						</Alert>
					) : selectedCountryCodes.length === 0 && !includeEuAverage ? (
						<EmptyBlock
							icon={<ChartSplineIcon className="size-5" />}
							message="Select at least one country or enable EU average"
						/>
					) : !history ||
						history.series.length === 0 ||
						chartData.length === 0 ? (
						<EmptyBlock
							icon={<ChartSplineIcon className="size-5" />}
							message="No price history for the current selection"
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
															{chartConfig[String(name)]?.label ?? String(name)}
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
									{chartSeries.map((series) => (
										<Line
											key={series.countryCode}
											dataKey={series.countryCode}
											type="monotone"
											stroke={`var(--color-${series.countryCode})`}
											strokeWidth={
												series.countryCode === EU_AVERAGE_SERIES_KEY ? 4 : 1.5
											}
											strokeDasharray={
												series.countryCode === EU_AVERAGE_SERIES_KEY
													? undefined
													: "3 1"
											}
											dot={
												showPointDots
													? {
															r: 2,
															strokeWidth: 1.2,
															fill: `var(--color-${series.countryCode})`,
														}
													: false
											}
											activeDot={{ r: 5 }}
											connectNulls
										/>
									))}
								</LineChart>
							</ChartContainer>

							<p className="text-muted-foreground text-xs">
								{visibleChartSeriesCount} series ·{" "}
								{history.series.reduce((t, s) => t + s.data.length, 0)} data
								points · converted to {displayCurrency}
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Current prices table */}
			<Card className="overflow-hidden pt-0">
				<CardHeader className="border-b py-4">
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="text-base">Current Prices</CardTitle>
						{isCurrentPricesFetching && <Spinner className="size-4" />}
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
										"Price list could not be loaded."}
								</AlertDescription>
							</Alert>
						</div>
					) : selectedCountryCodes.length === 0 ? (
						<div className="p-4">
							<EmptyBlock
								icon={<CoinsIcon className="size-5" />}
								message="Select at least one country to see prices"
							/>
						</div>
					) : !currentPrices || currentPrices.data.length === 0 ? (
						<div className="p-4">
							<EmptyBlock
								icon={<CoinsIcon className="size-5" />}
								message="No current prices for the selected countries"
							/>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item</TableHead>
									<TableHead>Site</TableHead>
									<TableHead>Country</TableHead>
									<TableHead className="text-right">
										Price ({displayCurrency})
									</TableHead>
									<TableHead className="text-right">Native</TableHead>
									<TableHead>Updated</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{currentPrices.data.map((row) => (
									<TableRow key={row.itemId}>
										<TableCell className="max-w-48 truncate font-medium">
											{row.itemName || row.itemUrl}
										</TableCell>
										<TableCell>{row.siteName}</TableCell>
										<TableCell>
											<Badge variant="outline">{row.countryCode}</Badge>
										</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{formatCurrencyValue(row.convertedPrice, displayCurrency)}
										</TableCell>
										<TableCell className="text-right font-mono text-muted-foreground tabular-nums">
											{formatCurrencyValue(
												row.originalPrice,
												row.originalCurrency,
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{formatTimestamp(row.time)}
										</TableCell>
										<TableCell>
											<a
												href={row.itemUrl}
												target="_blank"
												rel="noreferrer"
												className={cn(
													buttonVariants({ variant: "ghost", size: "icon-xs" }),
												)}
											>
												<ExternalLinkIcon className="size-3.5" />
											</a>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
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
	);
}

function EmptyBlock({
	icon,
	message,
}: {
	icon: React.ReactNode;
	message: string;
}) {
	return (
		<div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
			{icon}
			<p className="text-sm">{message}</p>
		</div>
	);
}

function getSelectableCountries(
	product: ProductDetailResponse,
): SelectableCountry[] {
	const countries = new Map<string, SelectableCountry>();

	for (const { item } of product.productItems) {
		const existing = countries.get(item.site.country.code);

		if (existing) {
			existing.itemCount += 1;
			continue;
		}

		countries.set(item.site.country.code, {
			code: item.site.country.code,
			name: item.site.country.name,
			currency: item.site.country.currency,
			itemCount: 1,
		});
	}

	return [...countries.values()].sort((left, right) =>
		left.name.localeCompare(right.name),
	);
}

function buildChartConfig(
	series: ProductHistoryResponse["series"],
): ChartConfig {
	return series.reduce<ChartConfig>((config, entry) => {
		config[entry.countryCode] = {
			label:
				entry.countryCode === EU_AVERAGE_SERIES_KEY
					? EU_AVERAGE_SERIES_NAME
					: `${entry.countryName} (${entry.countryCode})`,
			theme:
				entry.countryCode === EU_AVERAGE_SERIES_KEY
					? EU_AVERAGE_THEME
					: getCountryChartTheme(entry.countryCode),
		};

		return config;
	}, {});
}

function buildChartData(series: ProductHistoryResponse["series"]) {
	const pointsByBucket = new Map<string, Record<string, number | string>>();

	for (const countrySeries of series) {
		for (const point of countrySeries.data) {
			const existing = pointsByBucket.get(point.bucket) ?? {
				bucket: point.bucket,
			};
			existing[countrySeries.countryCode] = point.price;
			pointsByBucket.set(point.bucket, existing);
		}
	}

	return [...pointsByBucket.values()].sort(
		(left, right) =>
			new Date(String(left.bucket)).getTime() -
			new Date(String(right.bucket)).getTime(),
	);
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
	);

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
