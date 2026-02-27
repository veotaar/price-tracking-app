import type { App } from "@api/index";
import { treaty } from "@elysiajs/eden";

export const client = treaty<App>("http://localhost:3000/", {
	fetch: {
		credentials: "include",
	},
});
