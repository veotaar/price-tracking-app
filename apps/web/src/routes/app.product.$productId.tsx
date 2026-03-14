import type { CurrencyCode } from "@api/modules/products/model";
import { useQueryClient } from "@tanstack/react-query";
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
	useUpdateProduct,
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
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@web/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { Spinner } from "@web/components/ui/spinner";
import { Switch } from "@web/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web/components/ui/tabs";
import { getCountryChartTheme } from "@web/lib/chart-colors";
import { currencyCodes } from "@web/lib/currencies";
import { cn } from "@web/lib/utils";
import {
	ArrowLeftIcon,
	BarChart3Icon,
	ChartSplineIcon,
	CoinsIcon,
	ExternalLinkIcon,
	ListIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";

const INITIAL_DISPLAY_CURRENCY: CurrencyCode = "EUR";
const EU_AVERAGE_SERIES_KEY = "EU_AVG";
const EU_AVERAGE_SERIES_NAME = "EU Average";
const MAX_VISIBLE_DOTS = 120;
const MAX_ACCESSIBLE_POINTS = 400;
const CURRENT_PRICES_CHART_MIN_HEIGHT = 320;
const CURRENT_PRICES_CHART_ROW_HEIGHT = 42;
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

type ChartDataPoint = {
	bucket: string;
	bucketTimestamp: number;
	[key: string]: number | string;
};

type CurrentPriceChartRow = {
	itemId: string;
	label: string;
	fullLabel: string;
	countryCode: string;
	siteName: string;
	convertedPrice: number;
	originalPrice: number;
	normalizedPrice: number;
	normalizationFactor: number;
	originalCurrency: CurrencyCode;
	itemUrl: string;
	updatedAt: unknown;
};

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();
const compactCurrencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();
const shortDateFormatters = new Map<boolean, Intl.DateTimeFormat>();
const longDateFormatters = new Map<boolean, Intl.DateTimeFormat>();
const timestampFormatters = new Map<boolean, Intl.DateTimeFormat>();

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
	const queryClient = useQueryClient();
	const { data: product = loaderData.product } = useProduct(productId);
	const countries = useMemo(() => getSelectableCountries(product), [product]);
	const defaultCountryCodes = useMemo(
		() => countries.map((country) => country.code),
		[countries],
	);
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

	const selectedCountryCodeSet = useMemo(
		() => new Set(selectedCountryCodes),
		[selectedCountryCodes],
	);
	const selectedCountries = useMemo(
		() =>
			countries.filter((country) => selectedCountryCodeSet.has(country.code)),
		[countries, selectedCountryCodeSet],
	);
	const comparisonBasis =
		currentPrices?.comparisonBasis ??
		history?.comparisonBasis ??
		product.comparisonBasis ??
		null;
	const chartSeries = history?.series ?? [];
	const chartSeriesKeys = useMemo(
		() => chartSeries.map((series) => series.countryCode),
		[chartSeries],
	);
	const totalHistoryPoints = useMemo(
		() => chartSeries.reduce((total, series) => total + series.data.length, 0),
		[chartSeries],
	);
	const chartConfig = useMemo(
		() => buildChartConfig(chartSeries),
		[chartSeries],
	);
	const chartData = useMemo(() => buildChartData(chartSeries), [chartSeries]);
	const showPointDots = totalHistoryPoints <= MAX_VISIBLE_DOTS;
	const enableAccessibilityLayer = totalHistoryPoints <= MAX_ACCESSIBLE_POINTS;

	const yAxisDomain = useMemo(
		() => getYAxisDomain(chartData, chartSeriesKeys),
		[chartData, chartSeriesKeys],
	);
	const currentPricesChartConfig = useMemo(
		() => buildCurrentPricesChartConfig(currentPrices?.data ?? []),
		[currentPrices?.data],
	);
	const currentPricesChartData = useMemo(
		() => buildCurrentPricesChartData(currentPrices?.data ?? []),
		[currentPrices?.data],
	);
	const currentPricesChartHeight = Math.max(
		CURRENT_PRICES_CHART_MIN_HEIGHT,
		currentPricesChartData.length * CURRENT_PRICES_CHART_ROW_HEIGHT,
	);
	const visibleChartSeriesCount = chartSeries.length;
	const linkedItems = product.productItems.length;
	const linkedSites = new Set(
		product.productItems.map(({ item }) => item.site.id),
	).size;
	const {
		mutateAsync: updateProduct,
		isPending: isPublishTogglePending,
		error: publishToggleError,
		reset: resetPublishToggle,
	} = useUpdateProduct();
	const [pendingPublishedState, setPendingPublishedState] = useState<
		boolean | null
	>(null);

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
					description={`${linkedItems} items · ${linkedSites} sites · ${selectedCountries.length} markets · ${displayCurrency}${comparisonBasis ? ` · ${comparisonBasis}` : ""} · ${product.published ? "Published" : "Draft"}`}
					actions={
						<div className="flex flex-wrap items-start justify-end gap-3">
							<div className="flex flex-wrap gap-1">
								{countries.map((country) => (
									<Badge key={country.code} variant="outline">
										{country.code}
									</Badge>
								))}
							</div>
							<PublishProductControl
								checked={pendingPublishedState ?? product.published}
								pending={isPublishTogglePending}
								errorMessage={publishToggleError?.message}
								onChange={async (nextPublished) => {
									resetPublishToggle();
									setPendingPublishedState(nextPublished);

									try {
										await updateProduct({
											productId,
											name: product.name,
											comparisonBasis: product.comparisonBasis ?? null,
											published: nextPublished,
										});

										await Promise.all([
											queryClient.invalidateQueries({
												queryKey: ["product", productId],
											}),
											queryClient.invalidateQueries({
												queryKey: ["products"],
											}),
										]);
										setPendingPublishedState(null);
									} catch {
										setPendingPublishedState(null);
									}
								}}
							/>
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
						<div>
							<CardTitle className="text-base">
								Lowest Price Over Time
							</CardTitle>
							<CardDescription>
								{comparisonBasis
									? `Normalized to ${comparisonBasis} and converted to ${displayCurrency}.`
									: `Converted to ${displayCurrency}.`}
							</CardDescription>
						</div>
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
									accessibilityLayer={enableAccessibilityLayer}
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
											isAnimationActive={false}
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
								{visibleChartSeriesCount} series · {totalHistoryPoints} data
								points ·{" "}
								{comparisonBasis
									? `normalized to ${comparisonBasis}`
									: "converted"}{" "}
								in {displayCurrency}
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Current prices table */}
			<Card className="overflow-hidden pt-0">
				<CardHeader className="border-b py-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<CardTitle className="text-base">Current Prices</CardTitle>
							<CardDescription>
								{comparisonBasis
									? `Comparable prices normalized to ${comparisonBasis}.`
									: `Current prices converted to ${displayCurrency}.`}
							</CardDescription>
						</div>
						{isCurrentPricesFetching && <Spinner className="size-4" />}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{currentPricesError ? (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertTitle>Failed to load current prices</AlertTitle>
							<AlertDescription>
								{currentPricesError.message ||
									"Price list could not be loaded."}
							</AlertDescription>
						</Alert>
					) : selectedCountryCodes.length === 0 ? (
						<EmptyBlock
							icon={<CoinsIcon className="size-5" />}
							message="Select at least one country to see prices"
						/>
					) : !currentPrices || currentPrices.data.length === 0 ? (
						<EmptyBlock
							icon={<CoinsIcon className="size-5" />}
							message="No current prices for the selected countries"
						/>
					) : (
						<Tabs defaultValue="list" className="gap-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<TabsList variant="line">
									<TabsTrigger value="list">
										<ListIcon className="size-4" />
										List
									</TabsTrigger>
									<TabsTrigger value="chart">
										<BarChart3Icon className="size-4" />
										Bar chart
									</TabsTrigger>
								</TabsList>
								<p className="text-muted-foreground text-xs">
									{currentPrices.data.length} prices · sorted by{" "}
									{comparisonBasis ? "normalized" : "converted"} value
								</p>
							</div>

							<TabsContent
								value="list"
								className="overflow-hidden rounded-md border"
							>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead>Site</TableHead>
											<TableHead>Country</TableHead>
											<TableHead className="text-right">
												{comparisonBasis
													? `Normalized (${displayCurrency})`
													: `Price (${displayCurrency})`}
											</TableHead>
											<TableHead className="text-right">Shelf price</TableHead>
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
													{formatCurrencyValue(
														row.convertedPrice,
														displayCurrency,
													)}
													{comparisonBasis ? (
														<p className="text-muted-foreground text-xs">
															×{" "}
															{formatNormalizationFactor(
																row.normalizationFactor,
															)}
														</p>
													) : null}
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
															buttonVariants({
																variant: "ghost",
																size: "icon-xs",
															}),
														)}
													>
														<ExternalLinkIcon className="size-3.5" />
													</a>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TabsContent>

							<TabsContent value="chart" className="space-y-3">
								<div>
									<ChartContainer
										config={currentPricesChartConfig}
										className="aspect-auto min-h-80 w-full min-w-0"
										style={{ height: currentPricesChartHeight }}
									>
										<BarChart
											accessibilityLayer={currentPricesChartData.length <= 200}
											data={currentPricesChartData}
											layout="vertical"
											margin={{ left: 12, right: 56, top: 8, bottom: 8 }}
										>
											<CartesianGrid horizontal={false} />
											<XAxis type="number" hide />
											<YAxis
												dataKey="label"
												type="category"
												hide
												tickLine={false}
												axisLine={false}
												interval={0}
											/>
											<ChartTooltip
												cursor={false}
												content={
													<ChartTooltipContent
														hideIndicator
														labelFormatter={(_, payload) =>
															formatCurrentPricesTooltipLabel(
																payload?.[0]?.payload as
																	| CurrentPriceChartRow
																	| undefined,
															)
														}
														formatter={(value, _name, item) => {
															const row = item.payload as CurrentPriceChartRow;

															return (
																<div className="flex min-w-44 items-center justify-between gap-4">
																	<div className="grid gap-1">
																		<span className="text-muted-foreground text-xs">
																			{row.countryCode} · {row.siteName}
																		</span>
																		<span className="text-muted-foreground text-xs">
																			Shelf{" "}
																			{formatCurrencyValue(
																				row.originalPrice,
																				row.originalCurrency,
																			)}
																		</span>
																		{comparisonBasis ? (
																			<>
																				<span className="text-muted-foreground text-xs">
																					Normalized{" "}
																					{formatCurrencyValue(
																						row.normalizedPrice,
																						row.originalCurrency,
																					)}
																				</span>
																				<span className="text-muted-foreground text-xs">
																					Factor ×{" "}
																					{formatNormalizationFactor(
																						row.normalizationFactor,
																					)}
																				</span>
																			</>
																		) : null}
																	</div>
																	<span className="font-medium font-mono text-foreground tabular-nums">
																		{formatCurrencyValue(
																			Number(value),
																			displayCurrency,
																		)}
																	</span>
																</div>
															);
														}}
													/>
												}
											/>
											<Bar
												dataKey="convertedPrice"
												isAnimationActive={false}
												layout="vertical"
												radius={4}
											>
												<LabelList
													dataKey="label"
													position="insideLeft"
													offset={8}
													className="fill-(--color-label)"
													fontSize={12}
												/>
												<LabelList
													dataKey="convertedPrice"
													position="right"
													offset={8}
													className="fill-foreground"
													fontSize={12}
													formatter={(value: number) =>
														formatCurrencyValue(Number(value), displayCurrency)
													}
												/>
												{currentPricesChartData.map((row) => (
													<Cell
														key={row.itemId}
														fill={`var(--color-${row.countryCode})`}
													/>
												))}
											</Bar>
										</BarChart>
									</ChartContainer>
								</div>
								<p className="text-muted-foreground text-xs">
									Bars are ordered by{" "}
									{comparisonBasis ? "normalized" : "converted"} price in{" "}
									{displayCurrency}.
								</p>
							</TabsContent>
						</Tabs>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function PublishProductControl({
	checked,
	pending,
	errorMessage,
	onChange,
}: {
	checked: boolean;
	pending: boolean;
	errorMessage?: string;
	onChange: (nextChecked: boolean) => Promise<void>;
}) {
	return (
		<div className="min-w-64 space-y-2 rounded-lg border bg-card p-3">
			<FieldGroup>
				<Field orientation="horizontal" data-disabled={pending}>
					<FieldLabel htmlFor="product-published-switch">
						<Switch
							id="product-published-switch"
							checked={checked}
							disabled={pending}
							onCheckedChange={(nextChecked) => {
								void onChange(nextChecked);
							}}
						/>
						<FieldContent>
							<div className="flex items-center gap-2">
								<FieldTitle>Published</FieldTitle>
								<Badge variant={checked ? "default" : "secondary"}>
									{checked ? "Live" : "Draft"}
								</Badge>
							</div>
							<FieldDescription>
								Control whether this product is available for public surfaces.
							</FieldDescription>
						</FieldContent>
					</FieldLabel>
				</Field>
			</FieldGroup>
			{errorMessage ? (
				<Alert variant="destructive">
					<TriangleAlertIcon />
					<AlertTitle>Failed to update publish state</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			) : null}
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

function buildCurrentPricesChartConfig(
	rows: ProductCurrentPricesResponse["data"],
): ChartConfig {
	const config: ChartConfig = {
		convertedPrice: {
			label: "Normalized price",
		},
		label: {
			color: "var(--background)",
		},
	};

	for (const row of rows) {
		if (config[row.countryCode]) {
			continue;
		}

		config[row.countryCode] = {
			label: `${row.countryCode} (${row.siteName})`,
			theme: getCountryChartTheme(row.countryCode),
		};
	}

	return config;
}

function buildCurrentPricesChartData(
	rows: ProductCurrentPricesResponse["data"],
): CurrentPriceChartRow[] {
	return [...rows]
		.map((row) => ({
			itemId: row.itemId,
			label: `${row.countryName} · ${row.siteName}`,
			fullLabel: row.itemName || row.itemUrl,
			countryCode: row.countryCode,
			siteName: row.siteName,
			convertedPrice: row.convertedPrice,
			originalPrice: row.originalPrice,
			normalizedPrice: row.normalizedPrice,
			normalizationFactor: row.normalizationFactor,
			originalCurrency: row.originalCurrency,
			itemUrl: row.itemUrl,
			updatedAt: row.time,
		}))
		.sort((left, right) => {
			if (left.convertedPrice !== right.convertedPrice) {
				return left.convertedPrice - right.convertedPrice;
			}

			return left.fullLabel.localeCompare(right.fullLabel);
		});
}

function buildChartData(series: ProductHistoryResponse["series"]) {
	const pointsByBucket = new Map<string, ChartDataPoint>();

	for (const countrySeries of series) {
		for (const point of countrySeries.data) {
			const existing = pointsByBucket.get(point.bucket) ?? {
				bucket: point.bucket,
				bucketTimestamp: new Date(point.bucket).getTime(),
			};
			existing[countrySeries.countryCode] = point.price;
			pointsByBucket.set(point.bucket, existing);
		}
	}

	return [...pointsByBucket.values()].sort(
		(left, right) => left.bucketTimestamp - right.bucketTimestamp,
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
	return getCurrencyFormatter(currency).format(value);
}

function formatCompactCurrency(value: number, currency: CurrencyCode) {
	return getCompactCurrencyFormatter(currency).format(value);
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

	return getShortDateFormatter(hasTimeComponent).format(parsedDate);
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

	return getLongDateFormatter(hasTimeComponent).format(parsedDate);
}

function formatTimestamp(value: unknown) {
	const parsedDate = parseDateLike(value);

	if (!parsedDate) {
		return typeof value === "string" ? value : "-";
	}

	return getTimestampFormatter(true).format(parsedDate);
}

function getCurrencyFormatter(currency: CurrencyCode) {
	let formatter = currencyFormatters.get(currency);

	if (!formatter) {
		formatter = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			maximumFractionDigits: 2,
		});
		currencyFormatters.set(currency, formatter);
	}

	return formatter;
}

function getCompactCurrencyFormatter(currency: CurrencyCode) {
	let formatter = compactCurrencyFormatters.get(currency);

	if (!formatter) {
		formatter = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: 1,
		});
		compactCurrencyFormatters.set(currency, formatter);
	}

	return formatter;
}

function getShortDateFormatter(hasTimeComponent: boolean) {
	let formatter = shortDateFormatters.get(hasTimeComponent);

	if (!formatter) {
		formatter = new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			...(hasTimeComponent
				? {
						hour: "numeric",
						minute: "2-digit",
					}
				: {}),
		});
		shortDateFormatters.set(hasTimeComponent, formatter);
	}

	return formatter;
}

function getLongDateFormatter(hasTimeComponent: boolean) {
	let formatter = longDateFormatters.get(hasTimeComponent);

	if (!formatter) {
		formatter = new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			...(hasTimeComponent
				? {
						timeStyle: "short",
					}
				: {}),
		});
		longDateFormatters.set(hasTimeComponent, formatter);
	}

	return formatter;
}

function getTimestampFormatter(hasTimeComponent: boolean) {
	let formatter = timestampFormatters.get(hasTimeComponent);

	if (!formatter) {
		formatter = new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		});
		timestampFormatters.set(hasTimeComponent, formatter);
	}

	return formatter;
}

function formatCurrentPricesTooltipLabel(row?: CurrentPriceChartRow) {
	if (!row) {
		return "Current normalized price";
	}

	return `${row.countryCode} · ${row.fullLabel}`;
}

function formatNormalizationFactor(value: number) {
	return value
		.toFixed(value >= 1 ? 2 : 4)
		.replace(/\.0+$/, "")
		.replace(/(\.\d*?)0+$/, "$1");
}

function areStringArraysEqual(left: string[], right: string[]) {
	if (left.length !== right.length) {
		return false;
	}

	const leftSorted = [...left].sort();
	const rightSorted = [...right].sort();

	return leftSorted.every((value, index) => value === rightSorted[index]);
}
