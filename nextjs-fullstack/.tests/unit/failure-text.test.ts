import assert from "node:assert/strict";
import { test } from "node:test";
import { failureText } from "../../lib/failure-text";

test("prints the real cause of a failure", () => {
  const error = new Error("ENOENT: no such file or directory, mkdir '/nope/pglite'");
  assert.equal(failureText(error, {}), "ENOENT: no such file or directory, mkdir '/nope/pglite'");
});

test("prints the cause of a wrapped query error, not the query parameters", () => {
  const wrapped = new Error("Failed query: insert into app_settings\nparams: session_signing_key,SECRETKEY", {
    cause: Object.assign(new Error("relation \"app_settings\" does not exist"), { code: "42P01" }),
  });
  assert.equal(failureText(wrapped, {}), "42P01 relation \"app_settings\" does not exist");
});

test("removes the database URL and its password", () => {
  const url = "postgresql://app:hunter2@db.internal:5432/app";
  const error = new Error(`connect failed for ${url} (password hunter2)`);
  assert.equal(failureText(error, { DATABASE_URL: url }), "connect failed for [redacted] (password [redacted])");
});
