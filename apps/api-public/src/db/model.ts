import { country } from "./schema/country";
import { exchangeRate } from "./schema/exchange-rate";
import { item } from "./schema/item";
import { price } from "./schema/price";
import { product } from "./schema/product";
import { productItem } from "./schema/product-item";
import { site } from "./schema/site";

export const table = {
	country,
	exchangeRate,
	site,
	item,
	product,
	productItem,
	price,
} as const;

export type Table = typeof table;
