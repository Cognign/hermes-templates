import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { drizzle } from "drizzle-orm/pg-proxy";
import { migrate } from "drizzle-orm/pg-proxy/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import { generateSessionKey, SESSION_KEY_SETTING } from "@/lib/auth/session-key";
import { openDatabase } from "@/lib/db/open";
import { databaseConfigFrom, type DatabaseConfig } from "@/lib/env-core";
import { appSettings } from "@/lib/server/db/schema";

export const MIGRATION_LOCK_ID = 742103421;
const DEFAULT_TIMEOUT_MS = 30_000;
const sourceMigrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);


/**
 * Migrates, then makes sure the session key exists. Safe to run on every start.
 * The release bundle passes its own copy of the migrations folder.
 */
export async function runMigrations(
  timeoutMs = DEFAULT_TIMEOUT_MS,
  migrationsFolder = sourceMigrationsFolder,
) {
  const config = databaseConfigFrom(process.env);
  if (config.kind === "pglite") return migrateEmbedded(config, migrationsFolder);
  return migratePostgres(config, timeoutMs, migrationsFolder);
}

// PGlite has one process at a time, so no lock is needed. The start script runs this
// to completion before the web server opens the same folder.
async function migrateEmbedded(
  config: Extract<DatabaseConfig, { kind: "pglite" }>,
  migrationsFolder: string,
) {
  const { db, close } = openDatabase(config);
  try {
    await migratePglite(db as Parameters<typeof migratePglite>[0], { migrationsFolder });
    await db
      .insert(appSettings)
      .values({ key: SESSION_KEY_SETTING, value: generateSessionKey() })
      .onConflictDoNothing();
  } finally {
    await close();
  }
}

async function migratePostgres(
  config: Extract<DatabaseConfig, { kind: "postgres" }>,
  timeoutMs: number,
  migrationsFolder: string,
) {
  const client = postgres(config.url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    // A repeat start prints "already exists, skipping" notices; they are not failures.
    onnotice: () => {},
  });
  const deadline = Date.now() + timeoutMs;
  let connection: postgres.ReservedSql | undefined;
  let locked = false;

  try {
    connection = await client.reserve();
    while (!locked && Date.now() < deadline) {
      const [row] = await connection<{ acquired: boolean }[]>`
        select pg_try_advisory_lock(${MIGRATION_LOCK_ID}) as acquired
      `;
      locked = row?.acquired === true;
      if (!locked) await delay(200);
    }
    if (!locked) throw new Error("Timed out waiting for the migration lock");

    const reserved = connection;
    const db = drizzle(async (query, params) => ({
      rows: await reserved.unsafe(query, params),
    }));
    await migrate(
      db,
      async (queries) => {
        await reserved`begin`;
        try {
          for (const query of queries) await reserved.unsafe(query);
          await reserved`commit`;
        } catch (error) {
          await reserved`rollback`;
          throw error;
        }
      },
      { migrationsFolder },
    );
    // Still under the lock, so two starting copies cannot both create a key.
    await reserved`
      insert into app_settings (key, value)
      values (${SESSION_KEY_SETTING}, ${generateSessionKey()})
      on conflict (key) do nothing
    `;
  } finally {
    if (locked && connection) {
      await connection`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`.catch(() => undefined);
    }
    connection?.release();
    await client.end({ timeout: 5 }).catch(() => undefined);
  }
}
