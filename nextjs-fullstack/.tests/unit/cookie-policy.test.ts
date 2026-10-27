import assert from "node:assert/strict";
import test from "node:test";
import { sessionCookiePolicy } from "../../lib/auth/cookie-policy";

const dest = (value?: string) => new Headers(value ? { "sec-fetch-dest": value } : {});

test("a request from an iframe gets a partitioned SameSite=None cookie", () => {
  for (const frame of ["iframe", "frame"])
    assert.deepEqual(sessionCookiePolicy(dest(frame), true), {
      secure: true,
      sameSite: "none",
      partitioned: true,
    });
});

test("top level and unknown requests keep Lax", () => {
  for (const value of ["document", "empty", undefined])
    assert.deepEqual(sessionCookiePolicy(dest(value), true), {
      secure: true,
      sameSite: "lax",
      partitioned: false,
    });
});

test("without Secure the cookie stays Lax even in an iframe", () => {
  assert.deepEqual(sessionCookiePolicy(dest("iframe"), false), {
    secure: false,
    sameSite: "lax",
    partitioned: false,
  });
});
