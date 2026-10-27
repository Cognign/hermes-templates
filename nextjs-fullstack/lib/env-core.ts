import path from "node:path";

type RuntimeEnv = Record<string, string | undefined>;

export type DatabaseConfig =
  | { kind: "postgres"; url: string }
  | { kind: "pglite"; dir: string };

/**
 * PostgreSQL when DATABASE_URL is set. Otherwise an embedded PGlite database,
 * but never in production: a release without a database must not start.
 */
export function databaseConfigFrom(env: RuntimeEnv): DatabaseConfig {
  const value = env.DATABASE_URL?.trim();
  if (!value) {
    if (env.APP_ENV?.trim().toLowerCase() === "production")
      throw new Error(
        "DATABASE_URL is required when APP_ENV=production. Declare the database integration in hermes-app.json.",
      );
    return { kind: "pglite", dir: path.resolve(env.DATA_DIR?.trim() || ".data", "pglite") };
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  return { kind: "postgres", url: value };
}

export function sessionCookieSecureFrom(env: RuntimeEnv) {
  return env.SESSION_COOKIE_SECURE !== "false";
}

export function validateRuntimeEnvFrom(env: RuntimeEnv) {
  databaseConfigFrom(env);
}
