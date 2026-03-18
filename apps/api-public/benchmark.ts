import { $ } from "bun";

type BenchmarkScenario = {
	name: string;
	description: string;
	path: string;
	connections: number;
	duration: string;
	queriesPerSecond?: number;
};

type OhaResult = {
	summary: {
		successRate: number;
		total: number;
		slowest: number;
		fastest: number;
		average: number;
		requestsPerSec: number;
		totalData: number;
		sizePerRequest: number;
		sizePerSec: number;
	};
	latencyPercentiles: {
		p50: number | null;
		p95: number | null;
		p99: number | null;
		[key: string]: number | null;
	};
	statusCodeDistribution?: Record<string, number>;
	errorDistribution?: Record<string, number>;
};

type ScenarioResult = {
	scenario: BenchmarkScenario;
	url: string;
	outputPath: string;
	oha: OhaResult;
};

type ProductListResponse = {
	data?: Array<{
		id?: string;
	}>;
};

const appRoot = import.meta.dir;
const benchmarkPort = Number(process.env.BENCHMARK_PORT ?? "3101");
const baseUrl =
	process.env.BENCHMARK_BASE_URL ?? `http://127.0.0.1:${benchmarkPort}`;
const healthUrl = `${baseUrl}/api/health`;
const ohaBinary = process.env.OHA_BIN ?? "oha";
const benchmarkResultsRoot = `${appRoot}/benchmark-results`;
const runTimestamp = new Date().toISOString().replace(/[.:]/g, "-");
const runOutputDirectory = `${benchmarkResultsRoot}/${runTimestamp}`;
const shouldStartServer = !isTrue(process.env.BENCHMARK_SKIP_SERVER_START);
const defaultConnections = Number(process.env.BENCHMARK_CONNECTIONS ?? "50");
const defaultDuration = process.env.BENCHMARK_DURATION ?? "15s";
const defaultQueriesPerSecond = process.env.BENCHMARK_QPS
	? Number(process.env.BENCHMARK_QPS)
	: undefined;

function isTrue(value: string | undefined) {
	return value?.trim().toLowerCase() === "true";
}

function sleep(delayMs: number) {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function formatMilliseconds(seconds: number | null | undefined) {
	if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
		return "n/a";
	}

	return `${(seconds * 1000).toFixed(2)} ms`;
}

function formatRequestsPerSecond(value: number) {
	return `${value.toFixed(2)} req/s`;
}

function formatPercent(value: number) {
	return `${(value * 100).toFixed(2)}%`;
}

function formatStatusCodes(distribution: Record<string, number> | undefined) {
	const entries = Object.entries(distribution ?? {});

	if (entries.length === 0) {
		return "none";
	}

	return entries
		.map(([statusCode, count]) => `${statusCode}: ${count}`)
		.join(", ");
}

function formatErrors(distribution: Record<string, number> | undefined) {
	const entries = Object.entries(distribution ?? {});

	if (entries.length === 0) {
		return "none";
	}

	return entries.map(([message, count]) => `${message} (${count})`).join(", ");
}

function buildSummaryMarkdown(results: ScenarioResult[]) {
	const lines = [
		"# API Public Benchmark Summary",
		"",
		`Generated at: ${new Date().toISOString()}`,
		`Base URL: ${baseUrl}`,
		`Results directory: ${runOutputDirectory}`,
		`Default duration: ${defaultDuration}`,
		`Default concurrency: ${defaultConnections}`,
		`Default QPS: ${defaultQueriesPerSecond ?? "unlimited"}`,
		"",
		"## Scenarios",
		"",
	];

	for (const result of results) {
		const { scenario, oha, url, outputPath } = result;

		lines.push(`### ${scenario.name}`);
		lines.push("");
		lines.push(`- Description: ${scenario.description}`);
		lines.push(`- URL: ${url}`);
		lines.push(`- Duration: ${scenario.duration}`);
		lines.push(`- Concurrency: ${scenario.connections}`);
		lines.push(`- QPS limit: ${scenario.queriesPerSecond ?? "unlimited"}`);
		lines.push(`- Raw output: ${outputPath}`);
		lines.push(`- Success rate: ${formatPercent(oha.summary.successRate)}`);
		lines.push(
			`- Throughput: ${formatRequestsPerSecond(oha.summary.requestsPerSec)}`,
		);
		lines.push(`- Avg latency: ${formatMilliseconds(oha.summary.average)}`);
		lines.push(
			`- P50 latency: ${formatMilliseconds(oha.latencyPercentiles.p50)}`,
		);
		lines.push(
			`- P95 latency: ${formatMilliseconds(oha.latencyPercentiles.p95)}`,
		);
		lines.push(
			`- P99 latency: ${formatMilliseconds(oha.latencyPercentiles.p99)}`,
		);
		lines.push(`- Slowest request: ${formatMilliseconds(oha.summary.slowest)}`);
		lines.push(`- Fastest request: ${formatMilliseconds(oha.summary.fastest)}`);
		lines.push(
			`- Status codes: ${formatStatusCodes(oha.statusCodeDistribution)}`,
		);
		lines.push(`- Errors: ${formatErrors(oha.errorDistribution)}`);
		lines.push("");
	}

	return `${lines.join("\n")}\n`;
}

async function writeSummaryFile(results: ScenarioResult[]) {
	const summaryPath = `${runOutputDirectory}/summary.md`;
	const markdown = buildSummaryMarkdown(results);

	await Bun.write(summaryPath, markdown);
	console.log(`Saved summary to ${summaryPath}`);
}

async function ensureOhaIsInstalled() {
	const result = await $`which ${ohaBinary}`.nothrow().quiet();

	if (result.exitCode !== 0) {
		throw new Error(
			`Could not find '${ohaBinary}' on PATH. Set OHA_BIN if the binary has a different name.`,
		);
	}

	console.log(`Using oha binary: ${ohaBinary}`);
	console.log(`Writing benchmark output to ${runOutputDirectory}`);
	console.log(`Target base URL: ${baseUrl}`);
	console.log(`Default duration per scenario: ${defaultDuration}`);
	console.log(`Default concurrency per scenario: ${defaultConnections}`);
	if (defaultQueriesPerSecond) {
		console.log(`Default QPS limit per scenario: ${defaultQueriesPerSecond}`);
	}
	console.log(
		shouldStartServer
			? `Starting a temporary local API server on port ${benchmarkPort} with Sentry disabled.`
			: "Skipping server startup. Benchmarks will run against the provided BENCHMARK_BASE_URL.",
	);
	console.log("");
}

function startLocalServer() {
	return Bun.spawn([process.execPath, "run", "src/index.ts"], {
		cwd: appRoot,
		env: {
			...process.env,
			PORT: String(benchmarkPort),
			SENTRY_ENABLED: "false",
			SENTRY_DSN: "",
		},
		stdout: "inherit",
		stderr: "inherit",
	});
}

async function waitForHealthcheck(url: string, timeoutMs = 30_000) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			const response = await fetch(url);

			if (response.ok) {
				return;
			}
		} catch {
			// The server is still starting.
		}

		await sleep(500);
	}

	throw new Error(`Timed out waiting for API healthcheck at ${url}.`);
}

async function resolveBenchmarkProductId() {
	const response = await fetch(`${baseUrl}/api/products?page=1&limit=1`);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch products for benchmark discovery: ${response.status} ${response.statusText}`,
		);
	}

	const payload = (await response.json()) as ProductListResponse;
	return payload.data?.[0]?.id ?? null;
}

function buildScenarios(productId: string | null): BenchmarkScenario[] {
	const scenarios: BenchmarkScenario[] = [
		{
			name: "health",
			description: "Health endpoint baseline",
			path: "/api/health",
			connections: Math.max(defaultConnections, 100),
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
		{
			name: "products-list-default",
			description: "Paginated product list",
			path: "/api/products?page=1&limit=20",
			connections: defaultConnections,
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
		{
			name: "products-list-wide",
			description: "Wide product list page",
			path: "/api/products?page=1&limit=100",
			connections: defaultConnections,
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
	];

	if (!productId) {
		console.warn(
			"No published products were returned by /api/products. Product-specific benchmarks will be skipped.",
		);
		return scenarios;
	}

	return [
		...scenarios,
		{
			name: "product-detail",
			description: "Single product detail",
			path: `/api/products/${productId}`,
			connections: defaultConnections,
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
		{
			name: "product-history",
			description: "Price history with EU average",
			path: `/api/products/${productId}/history?currency=EUR&countryCodes=DE,FR,NL&includeEuAverage=true`,
			connections: defaultConnections,
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
		{
			name: "product-current-prices",
			description: "Current prices in EUR",
			path: `/api/products/${productId}/currentPrices?currency=EUR&countryCodes=DE,FR,NL`,
			connections: defaultConnections,
			duration: defaultDuration,
			queriesPerSecond: defaultQueriesPerSecond,
		},
	];
}

async function runScenario(
	scenario: BenchmarkScenario,
): Promise<ScenarioResult> {
	const scenarioUrl = `${baseUrl}${scenario.path}`;
	const scenarioOutputPath = `${runOutputDirectory}/${scenario.name}.json`;
	const qpsArgs =
		scenario.queriesPerSecond && scenario.queriesPerSecond > 0
			? ["-q", String(scenario.queriesPerSecond), "--latency-correction"]
			: [];

	console.log(`Benchmarking: ${scenario.name}`);
	console.log(`Description: ${scenario.description}`);
	console.log(`URL: ${scenarioUrl}`);
	console.log(
		`Duration: ${scenario.duration}, concurrency: ${scenario.connections}`,
	);
	if (scenario.queriesPerSecond) {
		console.log(`QPS limit: ${scenario.queriesPerSecond}`);
	}

	await $`${ohaBinary} --no-tui --output-format json --stats-success-breakdown -z ${scenario.duration} -c ${scenario.connections} ${qpsArgs} -H "Accept: application/json" -o ${scenarioOutputPath} ${scenarioUrl}`;
	const oha = (await Bun.file(scenarioOutputPath).json()) as OhaResult;

	console.log(`Saved oha output to ${scenarioOutputPath}`);
	console.log("");

	return {
		scenario,
		url: scenarioUrl,
		outputPath: scenarioOutputPath,
		oha,
	};
}

async function stopLocalServer(server: Bun.Subprocess | null) {
	if (!server) {
		return;
	}

	server.kill();
	await server.exited;
	console.log("Stopped temporary benchmark server.");
}

let activeServer: Bun.Subprocess | null = null;

try {
	await ensureOhaIsInstalled();
	await $`mkdir -p ${runOutputDirectory}`;

	if (shouldStartServer) {
		activeServer = startLocalServer();
		await waitForHealthcheck(healthUrl);
	}

	const productId = await resolveBenchmarkProductId();
	const scenarios = buildScenarios(productId);
	const results: ScenarioResult[] = [];

	for (const scenario of scenarios) {
		results.push(await runScenario(scenario));
	}

	await writeSummaryFile(results);

	console.log(`Benchmark run complete. Results are in ${runOutputDirectory}`);
} finally {
	await stopLocalServer(activeServer);
}
