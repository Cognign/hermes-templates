import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import type { DatabaseConfig } from "@/lib/env-core";
import * as schema from "@/lib/server/db/schema";

/** Both drivers share this surface, so routes never know which one runs. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export function openDatabase(config: DatabaseConfig): {
  db: Database;
  close: () => Promise<void>;
} {
  if (config.kind === "pglite") {
    // PGlite creates the folder but not its parents, and a fresh clone has none.
    // Owner-only: the folder holds the session signing key and password hashes.
    mkdirSync(config.dir, { recursive: true, mode: 0o700 });
    const client = new PGlite(config.dir);
    return {
      db: drizzlePglite({ client, schema }),
      close: () => client.close(),
    };
  }
  const client = postgres(config.url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return {
    db: drizzlePostgres(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}
