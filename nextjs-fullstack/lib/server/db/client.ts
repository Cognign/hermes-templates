import "server-only";

import { openDatabase, type Database } from "@/lib/db/open";
import { databaseConfig } from "@/lib/server/env";

// Kept on globalThis so dev hot reloads never open a second PGlite on the same folder.
const cache = globalThis as typeof globalThis & { __appDatabase?: Database };

export function db() {
  cache.__appDatabase ??= openDatabase(databaseConfig()).db;
  return cache.__appDatabase;
}
