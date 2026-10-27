import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // `next dev` would otherwise write an AGENTS.md into the app when it sees a coding agent.
  agentRules: false,
  // `next dev` would otherwise write an AGENTS.md into the app when it sees a coding agent.
  // PGlite loads its wasm files from disk, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
