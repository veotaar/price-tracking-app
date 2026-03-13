import { db } from "@api/db/db";
import { table } from "@api/db/model";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type {
	AddItem,
	CurrencyCode,
	InsertProduct,
	ProductAnalyticsQuery,
	UpdateProduct,
} from "./model";

export type ProductPriceHistoryPoint = {
	bucket: string;
	price: number;
};

export type ProductPriceHistorySeries = {
	countryCode: string;
	countryName: string;
	data: ProductPriceHistoryPoint[];
};

export type ProductPriceHistoryResponse = {
	productId: string;
	displayCurrency: CurrencyCode;
	series: ProductPriceHistorySeries[];
};

const EU_AVERAGE_SERIES_KEY = "EU_AVG";
const EU_AVERAGE_SERIES_NAME = "EU Average";

export type ProductCurrentPriceRow = {
	itemId: string;
	itemName: string | null;
	itemUrl: string;
	siteId: string;
	siteName: string;
	countryCode: string;
	countryName: string;
	originalPrice: number;
	originalCurrency: CurrencyCode;
	convertedPrice: number;
	time: string;
};

export type ProductCurrentPricesResponse = {
	productId: string;
	displayCurrency: CurrencyCode;
	data: ProductCurrentPriceRow[];
};

const historyRowSchema = z.object({
	bucket: z.coerce.date(),
	countryCode: z.string().min(2),
	countryName: z.string().min(1),
	price: z.coerce.number(),
});

const historyBoundsSchema = z.object({
	minTime: z.coerce.date().nullable(),
	maxTime: z.coerce.date().nullable(),
});

const currentPriceRowSchema = z.object({
	itemId: z.string().min(1),
	itemName: z.string().nullable(),
	itemUrl: z.string().url(),
	siteId: z.string().min(1),
	siteName: z.string().min(1),
	countryCode: z.string().min(2),
	countryName: z.string().min(1),
	originalPrice: z.coerce.number(),
	originalCurrency: z.string().min(3),
	convertedPrice: z.coerce.number(),
	time: z.coerce.date(),
});

async function getActiveProductRecord(id: string) {
	return db.query.product.findFirst({
		columns: {
			id: true,
		},
		where: and(eq(table.product.id, id), isNull(table.product.deletedAt)),
	});
}

function getCountryFilterSql(
	countryCodes: ProductAnalyticsQuery["countryCodes"],
) {
	if (!countryCodes?.length) {
		return sql.empty();
	}

	return sql`AND c.code IN (${sql.join(
		countryCodes.map((countryCode) => sql`${countryCode}`),
		sql`, `,
	)})`;
}

function getHistoryScopeSql(
	countryCodes: ProductAnalyticsQuery["countryCodes"],
	includeEuAverage: boolean,
) {
	const conditions = [] as ReturnType<typeof sql>[];

	if (countryCodes?.length) {
		conditions.push(
			sql`c.code IN (${sql.join(
				countryCodes.map((countryCode) => sql`${countryCode}`),
				sql`, `,
			)})`,
		);
	}

	if (includeEuAverage) {
		conditions.push(sql`c.eu_member = true`);
	}

	if (conditions.length === 0) {
		return sql`AND 1 = 0`;
	}

	return sql`AND (${sql.join(conditions, sql` OR `)})`;
}

function getSeriesCountryFilterSql(
	countryCodes: ProductAnalyticsQuery["countryCodes"],
) {
	if (!countryCodes?.length) {
		return sql.empty();
	}

	return sql`AND "countryCode" IN (${sql.join(
		countryCodes.map((countryCode) => sql`${countryCode}`),
		sql`, `,
	)})`;
}

function getHistoryBucketInterval(minTime: Date | null, maxTime: Date | null) {
	if (!minTime || !maxTime) {
		return "1 day" as const;
	}

	const rangeMs = maxTime.getTime() - minTime.getTime();
	const oneDayMs = 24 * 60 * 60 * 1000;

	if (rangeMs <= oneDayMs * 3) {
		return "1 hour" as const;
	}

	if (rangeMs <= oneDayMs * 120) {
		return "1 day" as const;
	}

	return "1 week" as const;
}

export async function listProducts(page: number, limit: number) {
	const offset = (page - 1) * limit;

	const rows = await db.query.product.findMany({
		where: isNull(table.product.deletedAt),
		limit,
		offset,
		with: {
			productItems: {
				with: { item: true },
			},
		},
	});

	const countResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(table.product)
		.where(isNull(table.product.deletedAt));
	const count = countResult[0]?.count ?? 0;

	return {
		data: rows,
		pagination: {
			page,
			limit,
			total: count,
			totalPages: Math.ceil(count / limit),
		},
	};
}

export async function getProduct(id: string) {
	return db.query.product.findFirst({
		where: and(eq(table.product.id, id), isNull(table.product.deletedAt)),
		with: {
			productItems: {
				with: {
					item: {
						with: { site: { with: { country: true } } },
					},
				},
			},
		},
	});
}

export async function getProductPriceHistory(
	productId: string,
	{ currency, countryCodes, includeEuAverage }: ProductAnalyticsQuery,
): Promise<ProductPriceHistoryResponse | null> {
	const product = await getActiveProductRecord(productId);

	if (!product) {
		return null;
	}

	if (!countryCodes?.length && !includeEuAverage) {
		return {
			productId,
			displayCurrency: currency,
			series: [],
		};
	}

	const historyScopeSql = getHistoryScopeSql(countryCodes, includeEuAverage);
	const seriesCountryFilterSql = getSeriesCountryFilterSql(countryCodes);
	const historyBoundsRows = await db.execute(sql<
		Array<{
			minTime: Date | string | null;
			maxTime: Date | string | null;
		}>
	>`
		SELECT
			MIN(p.time) AS "minTime",
			MAX(p.time) AS "maxTime"
		FROM product_item pi
		JOIN item i
			ON i.id = pi.item_id
			AND i.deleted_at IS NULL
		JOIN site s
			ON s.id = i.site_id
			AND s.deleted_at IS NULL
		JOIN country c
			ON c.id = s.country_id
			AND c.deleted_at IS NULL
		JOIN price p ON p.item_id = i.id
		WHERE pi.product_id = ${productId}
			AND pi.deleted_at IS NULL
			${historyScopeSql}
	`);
	const historyBounds = historyBoundsSchema.parse(
		historyBoundsRows.rows[0] ?? null,
	);
	const bucketInterval = getHistoryBucketInterval(
		historyBounds?.minTime ?? null,
		historyBounds?.maxTime ?? null,
	);
	const bucketIntervalSql = sql.raw(`INTERVAL '${bucketInterval}'`);
	const gapfillStart =
		historyBounds.minTime?.toISOString() ?? new Date().toISOString();
	const gapfillEnd =
		historyBounds.maxTime?.toISOString() ?? new Date().toISOString();

	const seriesStatements = [] as ReturnType<typeof sql>[];

	if (countryCodes?.length) {
		seriesStatements.push(sql`
			SELECT
				"bucket",
				"countryCode",
				"countryName",
				MIN("price") AS "price"
			FROM gapfilled_item_prices
			WHERE "price" IS NOT NULL
				${seriesCountryFilterSql}
			GROUP BY "bucket", "countryCode", "countryName"
		`);
	}

	if (includeEuAverage) {
		seriesStatements.push(sql`
			SELECT
				"bucket",
				${EU_AVERAGE_SERIES_KEY} AS "countryCode",
				${EU_AVERAGE_SERIES_NAME} AS "countryName",
				AVG("countryPrice") AS "price"
			FROM (
				SELECT
					"bucket",
					"countryCode",
					MIN("price") AS "countryPrice"
				FROM gapfilled_item_prices
				WHERE "price" IS NOT NULL
					AND "euMember" = true
				GROUP BY "bucket", "countryCode"
			) eu_gapfilled
			WHERE "countryPrice" IS NOT NULL
			GROUP BY "bucket"
		`);
	}

	const rows = await db.execute(sql<
		Array<{
			bucket: Date | string;
			countryCode: string;
			countryName: string;
			price: string | number;
		}>
	>`
		WITH converted_prices AS (
			SELECT
				i.id AS "itemId",
				p.time AS "time",
				c.code AS "countryCode",
				c.name AS "countryName",
				c.eu_member AS "euMember",
				CASE
					WHEN p.currency = ${currency} THEN p.price::numeric
					WHEN p.currency = 'EUR' AND er_target.rate IS NOT NULL
						THEN p.price::numeric * er_target.rate::numeric
					WHEN ${currency} = 'EUR' AND er_source.rate IS NOT NULL
						THEN p.price::numeric / er_source.rate::numeric
					WHEN er_source.rate IS NOT NULL AND er_target.rate IS NOT NULL
						THEN (p.price::numeric / er_source.rate::numeric) * er_target.rate::numeric
					ELSE NULL
				END AS "price"
			FROM product_item pi
			JOIN item i
				ON i.id = pi.item_id
				AND i.deleted_at IS NULL
			JOIN site s
				ON s.id = i.site_id
				AND s.deleted_at IS NULL
			JOIN country c
				ON c.id = s.country_id
				AND c.deleted_at IS NULL
			JOIN price p ON p.item_id = i.id
			LEFT JOIN LATERAL (
				SELECT er.rate
				FROM exchange_rate er
				WHERE er.currency = p.currency
					AND er.time <= p.time
				ORDER BY er.time DESC
				LIMIT 1
			) er_source ON true
			LEFT JOIN LATERAL (
				SELECT er.rate
				FROM exchange_rate er
				WHERE er.currency = ${currency}
					AND er.time <= p.time
				ORDER BY er.time DESC
				LIMIT 1
			) er_target ON true
			WHERE pi.product_id = ${productId}
				AND pi.deleted_at IS NULL
				${historyScopeSql}
		),
		gapfilled_item_prices AS (
			SELECT
				time_bucket_gapfill(${bucketIntervalSql}, "time",
					start => ${gapfillStart}::timestamptz,
					finish => ${gapfillEnd}::timestamptz + ${bucketIntervalSql}
				) AS "bucket",
				"itemId",
				"countryCode",
				"countryName",
				"euMember",
				locf(MIN("price")) AS "price"
			FROM converted_prices
			GROUP BY "bucket", "itemId", "countryCode", "countryName", "euMember"
		)
		SELECT
			"bucket",
			"countryCode",
			"countryName",
			"price"
		FROM (${sql.join(seriesStatements, sql` UNION ALL `)}) history_series
		ORDER BY "bucket" ASC, "countryCode" ASC
	`);

	const parsedRows = z.array(historyRowSchema).parse(rows.rows);
	const byCountry = new Map<string, ProductPriceHistorySeries>();

	for (const row of parsedRows) {
		const existing = byCountry.get(row.countryCode);
		const point = {
			bucket: row.bucket.toISOString(),
			price: row.price,
		};

		if (existing) {
			existing.data.push(point);
			continue;
		}

		byCountry.set(row.countryCode, {
			countryCode: row.countryCode,
			countryName: row.countryName,
			data: [point],
		});
	}

	return {
		productId,
		displayCurrency: currency,
		series: [...byCountry.values()],
	};
}

export async function getProductCurrentPrices(
	productId: string,
	{ currency, countryCodes }: ProductAnalyticsQuery,
): Promise<ProductCurrentPricesResponse | null> {
	const product = await getActiveProductRecord(productId);

	if (!product) {
		return null;
	}

	const countryFilterSql = getCountryFilterSql(countryCodes);
	const rows = await db.execute(sql<
		Array<{
			itemId: string;
			itemName: string | null;
			itemUrl: string;
			siteId: string;
			siteName: string;
			countryCode: string;
			countryName: string;
			originalPrice: string | number;
			originalCurrency: string;
			convertedPrice: string | number;
			time: Date | string;
		}>
	>`
		WITH latest_prices AS (
			SELECT DISTINCT ON (p.item_id)
				p.item_id AS "itemId",
				p.price::numeric AS "originalPrice",
				p.currency AS "originalCurrency",
				p.time AS "time",
				i.name AS "itemName",
				i.url AS "itemUrl",
				i.site_id AS "siteId",
				s.name AS "siteName",
				c.code AS "countryCode",
				c.name AS "countryName"
			FROM product_item pi
			JOIN item i
				ON i.id = pi.item_id
				AND i.deleted_at IS NULL
			JOIN site s
				ON s.id = i.site_id
				AND s.deleted_at IS NULL
			JOIN country c
				ON c.id = s.country_id
				AND c.deleted_at IS NULL
			JOIN price p ON p.item_id = i.id
			WHERE pi.product_id = ${productId}
				AND pi.deleted_at IS NULL
				${countryFilterSql}
			ORDER BY p.item_id ASC, p.time DESC
		)
		SELECT
			lp."itemId",
			lp."itemName",
			lp."itemUrl",
			lp."siteId",
			lp."siteName",
			lp."countryCode",
			lp."countryName",
			lp."originalPrice",
			lp."originalCurrency",
			CASE
				WHEN lp."originalCurrency" = ${currency} THEN lp."originalPrice"
				WHEN lp."originalCurrency" = 'EUR' AND er_target.rate IS NOT NULL
					THEN lp."originalPrice" * er_target.rate::numeric
				WHEN ${currency} = 'EUR' AND er_source.rate IS NOT NULL
					THEN lp."originalPrice" / er_source.rate::numeric
				WHEN er_source.rate IS NOT NULL AND er_target.rate IS NOT NULL
					THEN (lp."originalPrice" / er_source.rate::numeric) * er_target.rate::numeric
				ELSE NULL
			END AS "convertedPrice",
			lp."time"
		FROM latest_prices lp
		LEFT JOIN LATERAL (
			SELECT er.rate
			FROM exchange_rate er
			WHERE er.currency = lp."originalCurrency"
				AND er.time <= lp."time"
			ORDER BY er.time DESC
			LIMIT 1
		) er_source ON true
		LEFT JOIN LATERAL (
			SELECT er.rate
			FROM exchange_rate er
			WHERE er.currency = ${currency}
				AND er.time <= lp."time"
			ORDER BY er.time DESC
			LIMIT 1
		) er_target ON true
		WHERE CASE
			WHEN lp."originalCurrency" = ${currency} THEN lp."originalPrice"
			WHEN lp."originalCurrency" = 'EUR' AND er_target.rate IS NOT NULL
				THEN lp."originalPrice" * er_target.rate::numeric
			WHEN ${currency} = 'EUR' AND er_source.rate IS NOT NULL
				THEN lp."originalPrice" / er_source.rate::numeric
			WHEN er_source.rate IS NOT NULL AND er_target.rate IS NOT NULL
				THEN (lp."originalPrice" / er_source.rate::numeric) * er_target.rate::numeric
			ELSE NULL
		END IS NOT NULL
		ORDER BY "convertedPrice" ASC, lp."time" DESC, lp."countryCode" ASC
	`);

	const parsedRows = z.array(currentPriceRowSchema).parse(rows.rows);

	return {
		productId,
		displayCurrency: currency,
		data: parsedRows.map((row) => ({
			itemId: row.itemId,
			itemName: row.itemName,
			itemUrl: row.itemUrl,
			siteId: row.siteId,
			siteName: row.siteName,
			countryCode: row.countryCode,
			countryName: row.countryName,
			originalPrice: row.originalPrice,
			originalCurrency: row.originalCurrency as CurrencyCode,
			convertedPrice: row.convertedPrice,
			time: row.time.toISOString(),
		})),
	};
}

export async function createProduct(data: InsertProduct) {
	const [row] = await db.insert(table.product).values(data).returning();
	return row;
}

export async function updateProduct(id: string, data: UpdateProduct) {
	const [row] = await db
		.update(table.product)
		.set(data)
		.where(and(eq(table.product.id, id), isNull(table.product.deletedAt)))
		.returning();
	return row;
}

export async function deleteProduct(id: string) {
	const [row] = await db
		.update(table.product)
		.set({ deletedAt: new Date() })
		.where(and(eq(table.product.id, id), isNull(table.product.deletedAt)))
		.returning();
	return row;
}

export async function linkItemToProduct(
	productId: string,
	{ itemId }: AddItem,
) {
	const product = await db.query.product.findFirst({
		where: and(
			eq(table.product.id, productId),
			isNull(table.product.deletedAt),
		),
	});
	if (!product) return null;

	const item = await db.query.item.findFirst({
		where: and(eq(table.item.id, itemId), isNull(table.item.deletedAt)),
	});
	if (!item) return undefined;

	const [row] = await db
		.insert(table.productItem)
		.values({ productId, itemId })
		.onConflictDoNothing()
		.returning();

	return row ?? { productId, itemId };
}

export async function unlinkItemFromProduct(productId: string, itemId: string) {
	const [row] = await db
		.delete(table.productItem)
		.where(
			and(
				eq(table.productItem.productId, productId),
				eq(table.productItem.itemId, itemId),
			),
		)
		.returning();
	return row;
}
