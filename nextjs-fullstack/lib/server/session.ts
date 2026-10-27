import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookiePolicy } from "@/lib/auth/cookie-policy";
import {
  createSessionToken,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/auth/session-core";
import { sessionCookieSecure } from "@/lib/server/env";
import { sessionSigningKey } from "@/lib/server/session-key";

export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export async function signSession(claims: SessionClaims) {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return {
    token: await createSessionToken(claims, await sessionSigningKey(), expiresAt),
    expiresAt,
  };
}

export async function verifyConfiguredSession(token: string) {
  return verifySessionToken(token, await sessionSigningKey());
}

export async function sessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifyConfiguredSession(token) : null;
}

export async function sessionFromCookies() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifyConfiguredSession(token) : null;
}

export async function setSessionCookie(
  request: NextRequest,
  response: NextResponse,
  claims: SessionClaims,
) {
  const { token, expiresAt } = await signSession(claims);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    ...sessionCookiePolicy(request.headers, sessionCookieSecure()),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    ...sessionCookiePolicy(request.headers, sessionCookieSecure()),
    path: "/",
    maxAge: 0,
  });
}
