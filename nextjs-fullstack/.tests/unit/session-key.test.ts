import assert from "node:assert/strict";
import test from "node:test";
import { decodeSessionKey, generateSessionKey } from "../../lib/auth/session-key";

test("generates a 32 byte key that round trips and is never repeated", () => {
  const stored = generateSessionKey();
  assert.equal(decodeSessionKey(stored).byteLength, 32);
  assert.notEqual(generateSessionKey(), stored);
});

test("rejects a stored key of the wrong length", () => {
  assert.throws(() => decodeSessionKey("c2hvcnQ"), /not 32 bytes/);
});
