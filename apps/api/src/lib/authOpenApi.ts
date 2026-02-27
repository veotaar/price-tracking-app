// biome-ignore-all lint/suspicious/noExplicitAny: this is a snippet from elysia docs
import { auth } from "./auth";

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;

const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

export const OpenAPI = {
	getPaths: (prefix = "/api/auth") =>
		getSchema().then(({ paths }) => {
			const reference: typeof paths = Object.create(null);

			for (const path of Object.keys(paths)) {
				const pathData = paths[path];
				if (!pathData) continue;

				const key = prefix + path;

				reference[key] = pathData;

				for (const method of Object.keys(pathData)) {
					const operation = (reference[key] as any)[method];

					operation.tags = ["Better Auth"];
				}
			}

			return reference;
		}) as Promise<any>,
	components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
