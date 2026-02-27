import { db } from "@api/db/db";
import { table } from "@api/db/model";
import env from "@api/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, openAPI } from "better-auth/plugins";

export const auth = betterAuth({
	appName: "App Name",
	basePath: "/api/auth",
	trustedOrigins: ["http://localhost:3000", "http://localhost:5173"],
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: table.user,
			account: table.account,
			session: table.session,
			verification: table.verification,
		},
	}),
	rateLimit: {
		enabled: env.NODE_ENV !== "development",
		customRules: {
			"/get-session": false,
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		password: {
			hash: (password) =>
				Bun.password.hash(password, {
					algorithm: "argon2id",
					timeCost: 3,
				}),
			verify: ({ hash, password }) => Bun.password.verify(password, hash),
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "user",
				input: false,
			},
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			partitioned: true,
		},
	},
	plugins: [admin(), openAPI()],
});
