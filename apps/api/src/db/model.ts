import { account } from "./schema/account";
import { country } from "./schema/country";
import { exchangeRate } from "./schema/exchange-rate";
import { item } from "./schema/item";
import { price } from "./schema/price";
import { product } from "./schema/product";
import { productItem } from "./schema/product-item";
import { session } from "./schema/session";
import { site } from "./schema/site";
import { user } from "./schema/user";
import { verification } from "./schema/verification";

// table singleton
export const table = {
	user,
	account,
	session,
	verification,
	country,
	exchangeRate,
	site,
	item,
	product,
	productItem,
	price,
} as const;

export type Table = typeof table;
