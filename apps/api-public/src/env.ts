import { ZodError, z } from "zod";

const booleanEnvSchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().toLowerCase();

		if (normalizedValue === "true") {
			return true;
		}

		if (normalizedValue === "false") {
			return false;
		}
	}

	return value;
}, z.boolean().default(true));

const sentryDsnSchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}

	return value;
}, z.url().optional());

const EnvSchema = z.object({
	NODE_ENV: z.string().default("development"),
	DATABASE_URL: z.string(),
	PORT: z.coerce.number().default(3001),
	REDIS_URL: z.string().default("redis://localhost:6379"),
	FRONTEND_URL: z.url().default("http://localhost:5174"),
	SENTRY_DSN: sentryDsnSchema,
	SENTRY_ENABLED: booleanEnvSchema,
});

export type EnvSchema = z.infer<typeof EnvSchema>;

try {
	EnvSchema.parse(process.env);
} catch (error) {
	if (error instanceof ZodError) {
		console.error(z.formatError(error));
		process.exit(1);
	}
	throw error;
}

export default EnvSchema.parse(process.env);
