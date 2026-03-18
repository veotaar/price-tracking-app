import { ZodError, z } from "zod";

const EnvSchema = z.object({
	NODE_ENV: z.string().default("development"),
	DATABASE_URL: z.string(),
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.url(),
	PORT: z.coerce.number().default(3000),
	REDIS_URL: z.string().default("redis://localhost:6379"),
	FRONTEND_URL: z.url().default("http://localhost:5173"),
	TYPESENSE_URL: z.url().optional(),
	TYPESENSE_API_KEY: z.string().optional(),
	TYPESENSE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(5),
	TYPESENSE_COLLECTION_PREFIX: z.string().default("pta_admin"),
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
