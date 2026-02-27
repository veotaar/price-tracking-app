import type { auth } from "@api/lib/auth";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = "http://localhost:3000";

export const authClient = createAuthClient({
	fetchOptions: {
		credentials: "include",
	},

	plugins: [adminClient(), inferAdditionalFields<typeof auth>()],

	baseURL: API_URL,
	basePath: "/api/auth",

	sessionOptions: {
		refetchOnWindowFocus: false,
	},
});

export const { useSession, signIn, admin, signOut, signUp, resetPassword } =
	authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
