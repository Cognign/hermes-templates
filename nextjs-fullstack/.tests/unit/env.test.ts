import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  databaseConfigFrom,
  sessionCookieSecureFrom,
  validateRuntimeEnvFrom,
} from "../../lib/env-core";

test("uses PostgreSQL when DATABASE_URL is set", () => {
  assert.deepEqual(
    databaseConfigFrom({ DATABASE_URL: "postgresql://app:pass@localhost/app", APP_ENV: "production" }),
    { kind: "postgres", url: "postgresql://app:pass@localhost/app" },
  );
  assert.throws(() => databaseConfigFrom({ DATABASE_URL: "https://example.test" }), /PostgreSQL protocol/);
  assert.throws(() => databaseConfigFrom({ DATABASE_URL: "not a url" }), /valid PostgreSQL URL/);
});

test("falls back to PGlite under DATA_DIR outside production", () => {
  assert.deepEqual(databaseConfigFrom({}), {
    kind: "pglite",
    dir: path.resolve(".data", "pglite"),
  });
  assert.deepEqual(databaseConfigFrom({ APP_ENV: "preview", DATA_DIR: "/data" }), {
    kind: "pglite",
    dir: "/data/pglite",
  });
  assert.equal(databaseConfigFrom({ DATABASE_URL: "  ", DATA_DIR: "/data" }).kind, "pglite");
});

test("refuses to start in production without DATABASE_URL", () => {
  assert.throws(
    () => validateRuntimeEnvFrom({ APP_ENV: "production", DATA_DIR: "/data" }),
    /DATABASE_URL is required when APP_ENV=production/,
  );
  for (const APP_ENV of ["Production", " production", "PRODUCTION "]) {
    assert.throws(() => validateRuntimeEnvFrom({ APP_ENV }), /DATABASE_URL is required/);
  }
});

test("uses secure cookies unless local HTTP opts out", () => {
  assert.equal(sessionCookieSecureFrom({}), true);
  assert.equal(sessionCookieSecureFrom({ SESSION_COOKIE_SECURE: "true" }), true);
  assert.equal(sessionCookieSecureFrom({ SESSION_COOKIE_SECURE: "false" }), false);
});
