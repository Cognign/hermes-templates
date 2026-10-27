import "server-only";

import { eq } from "drizzle-orm";
import { decodeSessionKey, SESSION_KEY_SETTING } from "@/lib/auth/session-key";
import { db } from "@/lib/server/db/client";
import { appSettings } from "@/lib/server/db/schema";

let key: Promise<Uint8Array> | undefined;

async function load() {
  const [row] = await db()
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, SESSION_KEY_SETTING));
  if (!row) throw new Error("The session key is missing. Run npm run db:migrate.");
  return decodeSessionKey(row.value);
}

/** Read once per process. A failed read is not cached, so a later request retries. */
export function sessionSigningKey() {
  key ??= load().catch((error: unknown) => {
    key = undefined;
    throw error;
  });
  return key;
}
