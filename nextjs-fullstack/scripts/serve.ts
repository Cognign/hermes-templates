// Entry of the release folder. `npm run build` bundles it into
// .next/standalone/start.mjs, so a copy of that folder starts on its own with
// plain Node: no tsx, no source tree.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runMigrations } from "@/lib/db/migrate";
import { validateRuntimeEnvFrom } from "@/lib/env-core";
import { failureText } from "@/lib/failure-text";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    validateRuntimeEnvFrom(process.env);
  } catch (error) {
    // Configuration messages name variables, never values.
    console.error(error instanceof Error ? error.message : "Invalid runtime configuration.");
    console.error("Application startup stopped because runtime configuration is invalid.");
    process.exitCode = 1;
    return;
  }
  // server.js changes into its own folder, so a relative DATA_DIR must be pinned first.
  process.env.DATA_DIR = path.resolve(process.env.DATA_DIR?.trim() || ".data");
  try {
    await runMigrations(undefined, path.join(here, "drizzle"));
  } catch (error) {
    console.error(`Database migration failed: ${failureText(error, process.env)}`);
    console.error("Application startup stopped because the database could not be prepared.");
    process.exitCode = 1;
    return;
  }
  process.env.PORT ||= "8080";
  // Docker sets HOSTNAME to the container id; the server must listen on every interface.
  process.env.HOSTNAME = "0.0.0.0";
  await import(pathToFileURL(path.join(here, "server.js")).href);
}

void main();
