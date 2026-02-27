import { account } from "./schema/account";
import { session } from "./schema/session";
import { user } from "./schema/user";
import { verification } from "./schema/verification";

// table singleton
export const table = {
	user,
	account,
	session,
	verification,
} as const;

export type Table = typeof table;
