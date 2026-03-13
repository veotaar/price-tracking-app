import { auth } from "@api/lib/auth";
import { Elysia } from "elysia";

export const betterAuthRoutes = new Elysia({
	name: "better-auth-routes",
}).mount(auth.handler);

export const betterAuth = new Elysia({ name: "better-auth-macro" }).macro({
	auth: {
		async resolve({ status, request: { headers } }) {
			const session = await auth.api
				.getSession({
					headers,
					query: {
						disableCookieCache: true,
						disableRefresh: true,
					},
				})
				.catch((error) => {
					console.error("[auth] Failed to resolve request session:", error);
					return null;
				});

			if (!session) return status(401);

			return {
				user: session.user,
				session: session.session,
			};
		},
	},
});
