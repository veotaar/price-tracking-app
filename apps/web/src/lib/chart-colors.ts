type ChartThemeColor = {
	light: string;
	dark: string;
};

const COUNTRY_CHART_PALETTE = [
	{ light: "oklch(0.62 0.21 20)", dark: "oklch(0.76 0.16 20)" },
	{ light: "oklch(0.66 0.18 38)", dark: "oklch(0.8 0.15 38)" },
	{ light: "oklch(0.7 0.16 55)", dark: "oklch(0.83 0.13 55)" },
	{ light: "oklch(0.74 0.16 78)", dark: "oklch(0.86 0.13 78)" },
	{ light: "oklch(0.78 0.17 98)", dark: "oklch(0.88 0.14 98)" },
	{ light: "oklch(0.73 0.16 124)", dark: "oklch(0.84 0.13 124)" },
	{ light: "oklch(0.68 0.16 145)", dark: "oklch(0.81 0.13 145)" },
	{ light: "oklch(0.64 0.16 165)", dark: "oklch(0.78 0.13 165)" },
	{ light: "oklch(0.61 0.14 185)", dark: "oklch(0.75 0.12 185)" },
	{ light: "oklch(0.6 0.14 205)", dark: "oklch(0.74 0.11 205)" },
	{ light: "oklch(0.58 0.14 225)", dark: "oklch(0.72 0.11 225)" },
	{ light: "oklch(0.56 0.15 245)", dark: "oklch(0.71 0.12 245)" },
	{ light: "oklch(0.58 0.16 265)", dark: "oklch(0.73 0.13 265)" },
	{ light: "oklch(0.61 0.18 285)", dark: "oklch(0.76 0.15 285)" },
	{ light: "oklch(0.64 0.2 305)", dark: "oklch(0.79 0.16 305)" },
	{ light: "oklch(0.66 0.2 325)", dark: "oklch(0.8 0.16 325)" },
	{ light: "oklch(0.63 0.18 342)", dark: "oklch(0.77 0.15 342)" },
	{ light: "oklch(0.67 0.16 8)", dark: "oklch(0.8 0.13 8)" },
	{ light: "oklch(0.55 0.09 255)", dark: "oklch(0.69 0.08 255)" },
	{ light: "oklch(0.7 0.11 150)", dark: "oklch(0.82 0.09 150)" },
	{ light: "oklch(0.72 0.1 215)", dark: "oklch(0.84 0.08 215)" },
	{ light: "oklch(0.69 0.11 20)", dark: "oklch(0.82 0.09 20)" },
	{ light: "oklch(0.76 0.09 88)", dark: "oklch(0.87 0.08 88)" },
	{ light: "oklch(0.62 0.1 318)", dark: "oklch(0.76 0.09 318)" },
	{ light: "oklch(0.59 0.19 355)", dark: "oklch(0.74 0.15 355)" },
	{ light: "oklch(0.71 0.14 66)", dark: "oklch(0.84 0.12 66)" },
	{ light: "oklch(0.65 0.14 138)", dark: "oklch(0.79 0.11 138)" },
	{ light: "oklch(0.57 0.12 196)", dark: "oklch(0.71 0.1 196)" },
	{ light: "oklch(0.54 0.13 233)", dark: "oklch(0.69 0.1 233)" },
	{ light: "oklch(0.6 0.14 274)", dark: "oklch(0.74 0.11 274)" },
	{ light: "oklch(0.68 0.16 312)", dark: "oklch(0.81 0.13 312)" },
	{ light: "oklch(0.64 0.15 28)", dark: "oklch(0.78 0.12 28)" },
	{ light: "oklch(0.74 0.12 170)", dark: "oklch(0.86 0.1 170)" },
] as const satisfies readonly ChartThemeColor[];

const COUNTRY_COLOR_INDEX: Record<string, number> = {
	AT: 0,
	BE: 1,
	BG: 2,
	CH: 3,
	CY: 4,
	CZ: 5,
	DE: 6,
	DK: 7,
	EE: 8,
	ES: 9,
	FI: 10,
	FR: 11,
	GB: 12,
	GR: 13,
	HR: 14,
	HU: 15,
	IE: 16,
	IS: 17,
	IT: 18,
	LT: 19,
	LU: 20,
	LV: 21,
	NL: 22,
	NO: 23,
	PL: 24,
	PT: 25,
	RO: 26,
	RS: 27,
	SE: 28,
	SI: 29,
	SK: 30,
	TR: 31,
	UA: 32,
};

function getStableColorIndex(countryCode: string) {
	const normalizedCode = countryCode.trim().toUpperCase();
	const explicitIndex = COUNTRY_COLOR_INDEX[normalizedCode];

	if (explicitIndex !== undefined) {
		return explicitIndex;
	}

	const hash = [...normalizedCode].reduce(
		(total, character) => total * 31 + character.charCodeAt(0),
		0,
	);

	return Math.abs(hash) % COUNTRY_CHART_PALETTE.length;
}

export function getCountryChartTheme(countryCode: string): ChartThemeColor {
	return COUNTRY_CHART_PALETTE[getStableColorIndex(countryCode)];
}
