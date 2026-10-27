import assert from "node:assert/strict";
import test from "node:test";
import { initials } from "../../lib/initials";

test("takes the first letter of the first two words", () => {
  assert.equal(initials("alex smith"), "AS");
  assert.equal(initials("  Mary Jane Watson "), "MJ");
  assert.equal(initials("Alex"), "A");
});

test("never splits a grapheme", () => {
  assert.equal(initials("👩‍👩‍👧 Family"), "👩‍👩‍👧F");
  assert.equal(initials("Éloïse Ñandú"), "ÉÑ");
  assert.equal(initials("e\u0301mile"), "E\u0301");
});

test("leaves scripts without case as they are", () => {
  assert.equal(initials("山田 太郎"), "山太");
});

test("an email is one word", () => {
  assert.equal(initials("alex@example.com"), "A");
});

test("skips punctuation at the start of a word", () => {
  assert.equal(initials("李小龍 (Bruce Lee)"), "李B");
  assert.equal(initials("\"Quoted\" name"), "QN");
});
