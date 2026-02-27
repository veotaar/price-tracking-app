import { ZodError, z } from "zod";

const EnvSchema = z.object({
	NODE_ENV: z.string().default("development"),
	DATABASE_URL: z.string(),
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.url(),
	PORT: z.coerce.number().default(3000),
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
