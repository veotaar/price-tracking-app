import * as cheerio from "cheerio";
import { launch } from "cloakbrowser";

export interface ScrapeTarget {
	url: string;
	priceCssSelector: string;
	nameCssSelector: string;
	strategy: "fetch" | "browser";
}

async function fetchWithHttp(
	url: string,
): Promise<{ html: string; responseTimeMs: number }> {
	const start = performance.now();
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${url}: ${response.status} ${response.statusText}`,
		);
	}
	const html = await response.text();
	const responseTimeMs = Math.round(performance.now() - start);
	return { html, responseTimeMs };
}

async function fetchWithBrowser(
	url: string,
	priceCssSelector: string,
): Promise<{ html: string; responseTimeMs: number }> {
	const start = performance.now();
	const browser = await launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto(url, { waitUntil: "domcontentloaded" });
		await page.waitForSelector(priceCssSelector, { timeout: 15000 });

		const html = await page.content();
		const responseTimeMs = Math.round(performance.now() - start);
		return { html, responseTimeMs };
	} finally {
		await browser.close();
	}
}

/**
 * Fetch HTML from a URL using either HTTP or headless browser.
 */
export async function fetchHTML(
	target: ScrapeTarget,
): Promise<{ html: string; responseTimeMs: number }> {
	return target.strategy === "browser"
		? fetchWithBrowser(target.url, target.priceCssSelector)
		: fetchWithHttp(target.url);
}

/**
 * Extract text content from HTML using the given CSS selector.
 * Returns the trimmed text content of the first matching element, or null.
 */
export function extractText(html: string, cssSelector: string): string | null {
	const $ = cheerio.load(html);
	const el = $(cssSelector).first();
	if (!el.length) return null;

	const firstLine =
		el
			.text()
			.split("\n")
			.map((l) => l.trim())
			.find((l) => l.length > 0) ?? null;

	return firstLine;
}
