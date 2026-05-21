import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/postgres";

// `postgres-js` is lazy: no socket is opened until the first query, so
// constructing the client at module load is safe even without a reachable
// database (e.g. during `next build` with SKIP_ENV_VALIDATION).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
