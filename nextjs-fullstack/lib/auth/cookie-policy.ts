export type SessionCookiePolicy = {
  secure: boolean;
  sameSite: "lax" | "none";
  partitioned: boolean;
};

/**
 * Hermes shows previews in an iframe on another site. Browsers drop a Lax
 * cookie there, so a request that comes from a frame gets a partitioned
 * SameSite=None cookie. That cookie is only sent back inside the same
 * embedding page. Everything else keeps Lax. Plain HTTP (secure=false)
 * cannot carry SameSite=None, so it stays Lax and does not work in an iframe.
 */
export function sessionCookiePolicy(
  headers: Pick<Headers, "get">,
  secure: boolean,
): SessionCookiePolicy {
  const dest = headers.get("sec-fetch-dest");
  const framed = dest === "iframe" || dest === "frame";
  if (secure && framed) return { secure: true, sameSite: "none", partitioned: true };
  return { secure, sameSite: "lax", partitioned: false };
}
