// Makes .next/standalone a complete release folder after `next build`:
// static files, public files, migrations and the start script.
import { build } from "esbuild";
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(".next/standalone");
await stat(path.join(out, "server.js")).catch(() => {
  throw new Error("Run next build first: .next/standalone/server.js is missing.");
});

await mkdir(path.join(out, ".next"), { recursive: true });
await cp(".next/static", path.join(out, ".next/static"), { recursive: true });
await cp("public", path.join(out, "public"), { recursive: true }).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
await cp("drizzle", path.join(out, "drizzle"), { recursive: true });

await build({
  entryPoints: ["scripts/serve.ts"],
  outfile: path.join(out, "start.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // PGlite reads its wasm files from disk; Next already copies it into node_modules.
  external: ["@electric-sql/pglite"],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: "warning",
});
