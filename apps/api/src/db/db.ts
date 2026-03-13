import env from "@api/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 5_000,
	idleTimeoutMillis: 30_000,
	keepAlive: true,
	max: 10,
	maxLifetimeSeconds: 60 * 30,
});

pool.on("error", (error: Error) => {
	console.error("[db] Unexpected idle Postgres client error:", error);
});

export const db = drizzle({ client: pool, schema });
