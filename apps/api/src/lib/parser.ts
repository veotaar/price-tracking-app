export function parsePrice(raw: string): number | null {
	// Remove currency symbols and codes
	let cleaned = raw
		.replace(/[$€£₺¥₹]/g, "")
		.replace(/\b(USD|EUR|GBP|TL|TRY|JPY|INR)\b/gi, "")
		.trim();

	if (cleaned.length === 0) return null;

	// Detect decimal convention:
	// "1.234,56" (European) → comma is decimal separator
	// "1,234.56" (US/UK)   → dot is decimal separator
	// "1234,56"  (European, no thousands sep) → comma is decimal
	// "1234.56"  (US/UK, no thousands sep)    → dot is decimal
	const lastComma = cleaned.lastIndexOf(",");
	const lastDot = cleaned.lastIndexOf(".");

	if (lastComma > lastDot) {
		// Comma is the decimal separator (European style)
		cleaned = cleaned.replace(/\./g, "").replace(",", ".");
	} else if (lastDot > lastComma) {
		// Dot is the decimal separator (US style)
		cleaned = cleaned.replace(/,/g, "");
	} else {
		// No separators or only one type — just remove commas
		cleaned = cleaned.replace(/,/g, "");
	}

	// Remove any remaining non-numeric characters except dot and minus
	cleaned = cleaned.replace(/[^\d.-]/g, "");

	const result = Number.parseFloat(cleaned);
	return Number.isNaN(result) ? null : result;
}
