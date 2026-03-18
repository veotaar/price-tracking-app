import { db } from "@api/db/db";
import { table } from "@api/db/model";
import env from "@api/env";
import { and, eq, isNull } from "drizzle-orm";
import Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

type TypesenseCollectionName = "sites" | "items";

type SiteSearchDocument = {
	id: string;
	name: string;
	hostname: string;
	priceCssSelector: string;
	nameCssSelector: string;
	strategy: "fetch" | "browser";
	priceDivisor: number;
	countryId: string;
	countryName: string;
	countryCode: string;
	countryCurrency: string;
};

type ItemSearchDocument = {
	id: string;
	siteId: string;
	url: string;
	name: string;
	siteName: string;
	siteHostname: string;
	countryId: string;
	countryName: string;
	countryCode: string;
	countryCurrency: string;
};

type SiteSearchResponse = {
	id: string;
	name: string;
	hostname: string;
	priceCssSelector: string;
	nameCssSelector: string;
	strategy: "fetch" | "browser";
	priceDivisor: number;
	country: {
		id: string;
		name: string;
		code: string;
		currency: string;
	};
};

type ItemSearchResponse = {
	id: string;
	url: string;
	name: string | null;
	site: {
		id: string;
		name: string;
		hostname: string;
		country: {
			id: string;
			name: string;
			code: string;
			currency: string;
		};
	};
};

function isTypesenseConfigured() {
	return Boolean(env.TYPESENSE_URL && env.TYPESENSE_API_KEY);
}

function getClient() {
	if (!isTypesenseConfigured()) {
		return null;
	}

	const url = new URL(env.TYPESENSE_URL as string);

	return new Typesense.Client({
		nodes: [
			{
				host: url.hostname,
				port: Number.parseInt(
					url.port || (url.protocol === "https:" ? "443" : "80"),
					10,
				),
				protocol: url.protocol === "https:" ? "https" : "http",
			},
		],
		apiKey: env.TYPESENSE_API_KEY as string,
		connectionTimeoutSeconds: env.TYPESENSE_TIMEOUT_SECONDS,
	});
}

const typesenseClient = getClient();

function getCollectionName(name: TypesenseCollectionName) {
	return `${env.TYPESENSE_COLLECTION_PREFIX}_${name}`;
}

function mapSiteDocument(document: SiteSearchDocument): SiteSearchResponse {
	return {
		id: document.id,
		name: document.name,
		hostname: document.hostname,
		priceCssSelector: document.priceCssSelector,
		nameCssSelector: document.nameCssSelector,
		strategy: document.strategy,
		priceDivisor: document.priceDivisor,
		country: {
			id: document.countryId,
			name: document.countryName,
			code: document.countryCode,
			currency: document.countryCurrency,
		},
	};
}

function mapItemDocument(document: ItemSearchDocument): ItemSearchResponse {
	return {
		id: document.id,
		url: document.url,
		name: document.name || null,
		site: {
			id: document.siteId,
			name: document.siteName,
			hostname: document.siteHostname,
			country: {
				id: document.countryId,
				name: document.countryName,
				code: document.countryCode,
				currency: document.countryCurrency,
			},
		},
	};
}

async function ensureCollection(
	name: TypesenseCollectionName,
	schema: CollectionCreateSchema,
) {
	if (!typesenseClient) {
		return;
	}

	const collection = typesenseClient.collections(getCollectionName(name));

	try {
		await collection.retrieve();
	} catch {
		await typesenseClient.collections().create(schema);
	}
}

async function upsertDocument(
	collectionName: TypesenseCollectionName,
	document: SiteSearchDocument | ItemSearchDocument,
) {
	if (!typesenseClient) {
		return;
	}

	await typesenseClient
		.collections(getCollectionName(collectionName))
		.documents()
		.upsert(document);
}

async function deleteDocument(
	collectionName: TypesenseCollectionName,
	documentId: string,
) {
	if (!typesenseClient) {
		return;
	}

	try {
		await typesenseClient
			.collections(getCollectionName(collectionName))
			.documents(documentId)
			.delete();
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("Not Found") || error.message.includes("404"))
		) {
			return;
		}

		throw error;
	}
}

async function getSiteDocument(
	siteId: string,
): Promise<SiteSearchDocument | null> {
	const site = await db.query.site.findFirst({
		where: and(eq(table.site.id, siteId), isNull(table.site.deletedAt)),
		with: { country: true },
	});

	if (!site) {
		return null;
	}

	return {
		id: site.id,
		name: site.name,
		hostname: site.hostname,
		priceCssSelector: site.priceCssSelector,
		nameCssSelector: site.nameCssSelector,
		strategy: site.strategy,
		priceDivisor: site.priceDivisor,
		countryId: site.country.id,
		countryName: site.country.name,
		countryCode: site.country.code,
		countryCurrency: site.country.currency,
	};
}

async function getItemDocument(
	itemId: string,
): Promise<ItemSearchDocument | null> {
	const item = await db.query.item.findFirst({
		where: and(eq(table.item.id, itemId), isNull(table.item.deletedAt)),
		with: {
			site: {
				with: {
					country: true,
				},
			},
		},
	});

	if (!item) {
		return null;
	}

	return {
		id: item.id,
		siteId: item.site.id,
		url: item.url,
		name: item.name ?? "",
		siteName: item.site.name,
		siteHostname: item.site.hostname,
		countryId: item.site.country.id,
		countryName: item.site.country.name,
		countryCode: item.site.country.code,
		countryCurrency: item.site.country.currency,
	};
}

async function listSiteDocuments() {
	const sites = await db.query.site.findMany({
		where: isNull(table.site.deletedAt),
		with: { country: true },
	});

	return sites.map(
		(site) =>
			({
				id: site.id,
				name: site.name,
				hostname: site.hostname,
				priceCssSelector: site.priceCssSelector,
				nameCssSelector: site.nameCssSelector,
				strategy: site.strategy,
				priceDivisor: site.priceDivisor,
				countryId: site.country.id,
				countryName: site.country.name,
				countryCode: site.country.code,
				countryCurrency: site.country.currency,
			}) satisfies SiteSearchDocument,
	);
}

async function listItemDocuments() {
	const items = await db.query.item.findMany({
		where: isNull(table.item.deletedAt),
		with: {
			site: {
				with: {
					country: true,
				},
			},
		},
	});

	return items.map(
		(item) =>
			({
				id: item.id,
				siteId: item.site.id,
				url: item.url,
				name: item.name ?? "",
				siteName: item.site.name,
				siteHostname: item.site.hostname,
				countryId: item.site.country.id,
				countryName: item.site.country.name,
				countryCode: item.site.country.code,
				countryCurrency: item.site.country.currency,
			}) satisfies ItemSearchDocument,
	);
}

async function backfillCollection(
	collectionName: TypesenseCollectionName,
	documents: Array<SiteSearchDocument | ItemSearchDocument>,
) {
	if (!typesenseClient) {
		return;
	}

	for (const document of documents) {
		await upsertDocument(collectionName, document);
	}

	console.log(
		`[typesense] Backfilled ${documents.length} ${collectionName} documents`,
	);
}

export function isTypesenseSearchAvailable() {
	return Boolean(typesenseClient);
}

export async function initializeTypesenseSearch() {
	if (!typesenseClient) {
		console.warn(
			"[typesense] Search disabled because TYPESENSE_URL or TYPESENSE_API_KEY is missing",
		);
		return false;
	}

	await ensureCollection("sites", {
		name: getCollectionName("sites"),
		fields: [
			{ name: "id", type: "string" },
			{ name: "name", type: "string" },
			{ name: "hostname", type: "string" },
			{ name: "priceCssSelector", type: "string" },
			{ name: "nameCssSelector", type: "string" },
			{ name: "strategy", type: "string", facet: true },
			{ name: "priceDivisor", type: "int32" },
			{ name: "countryId", type: "string", facet: true },
			{ name: "countryName", type: "string" },
			{ name: "countryCode", type: "string", facet: true },
			{ name: "countryCurrency", type: "string", facet: true },
		],
	});

	await ensureCollection("items", {
		name: getCollectionName("items"),
		fields: [
			{ name: "id", type: "string" },
			{ name: "siteId", type: "string", facet: true },
			{ name: "url", type: "string" },
			{ name: "name", type: "string", optional: true },
			{ name: "siteName", type: "string" },
			{ name: "siteHostname", type: "string" },
			{ name: "countryId", type: "string", facet: true },
			{ name: "countryName", type: "string" },
			{ name: "countryCode", type: "string", facet: true },
			{ name: "countryCurrency", type: "string", facet: true },
		],
	});

	const [siteDocuments, itemDocuments] = await Promise.all([
		listSiteDocuments(),
		listItemDocuments(),
	]);

	await Promise.all([
		backfillCollection("sites", siteDocuments),
		backfillCollection("items", itemDocuments),
	]);

	return true;
}

export async function syncSiteDocument(siteId: string) {
	const document = await getSiteDocument(siteId);

	if (!document) {
		await deleteDocument("sites", siteId);
		return;
	}

	await upsertDocument("sites", document);
}

export async function deleteSiteDocument(siteId: string) {
	await deleteDocument("sites", siteId);
}

export async function syncItemDocument(itemId: string) {
	const document = await getItemDocument(itemId);

	if (!document) {
		await deleteDocument("items", itemId);
		return;
	}

	await upsertDocument("items", document);
}

export async function deleteItemDocument(itemId: string) {
	await deleteDocument("items", itemId);
}

export async function syncItemsForSite(siteId: string) {
	const items = await db.query.item.findMany({
		where: and(eq(table.item.siteId, siteId), isNull(table.item.deletedAt)),
		columns: { id: true },
	});

	await Promise.all(items.map((item) => syncItemDocument(item.id)));
}

export async function searchSites({
	query,
	countryId,
	perPage = 250,
}: {
	query?: string;
	countryId?: string;
	perPage?: number;
}) {
	if (!typesenseClient) {
		throw new Error("Typesense search is not configured");
	}

	const response = (await typesenseClient
		.collections(getCollectionName("sites"))
		.documents()
		.search({
			q: query?.trim() || "*",
			query_by: "name,hostname",
			filter_by: countryId ? `countryId:=${countryId}` : undefined,
			per_page: perPage,
			page: 1,
		})) as {
		hits?: Array<{ document: SiteSearchDocument }>;
	};

	return (response.hits ?? []).map((hit) => mapSiteDocument(hit.document));
}

export async function searchItems({
	query,
	siteId,
	perPage = 250,
}: {
	query?: string;
	siteId?: string;
	perPage?: number;
}) {
	if (!typesenseClient) {
		throw new Error("Typesense search is not configured");
	}

	const response = (await typesenseClient
		.collections(getCollectionName("items"))
		.documents()
		.search({
			q: query?.trim() || "*",
			query_by: "name,url,siteName,siteHostname",
			filter_by: siteId ? `siteId:=${siteId}` : undefined,
			per_page: perPage,
			page: 1,
		})) as {
		hits?: Array<{ document: ItemSearchDocument }>;
	};

	return (response.hits ?? []).map((hit) => mapItemDocument(hit.document));
}
