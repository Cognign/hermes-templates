import { randomBytes } from "node:crypto";

export const SESSION_KEY_SETTING = "session_signing_key";
const KEY_BYTES = 32;

/** A new random key, in the text form stored in app_settings. */
export function generateSessionKey() {
  return randomBytes(KEY_BYTES).toString("base64url");
}

export function decodeSessionKey(stored: string) {
  const key = Buffer.from(stored, "base64url");
  if (key.byteLength !== KEY_BYTES)
    throw new Error("The stored session key is not 32 bytes");
  return new Uint8Array(key);
}
