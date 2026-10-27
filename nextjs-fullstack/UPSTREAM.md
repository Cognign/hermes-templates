# Upstream sources and adaptations

This starter is an adapted copy of two projects, both MIT licensed.

1. Foundry's Next.js full-stack starter
   - Repository: <https://github.com/team8solutions/foundry-templates>, folder `nextjs-fullstack`
   - Source commit: `1bd498d18d3a53ab86073272f2738fcb7f0b918e` (main on 2026-10-27)
   - Licence: MIT, kept in `LICENSE`
2. The Vercel `nextjs/saas-starter` project that Foundry's starter was adapted from
   - Repository: <https://github.com/nextjs/saas-starter.git>
   - Source commit: `6e33e58b1e553a41fe22e6b941a7229a002de361`
   - Licence: MIT. Original copyright: Copyright (c) 2025 Vercel

Changes made for Hermes on top of Foundry's copy:

- `hermes-app.json` replaces Foundry's `.symposia/env.json`. Docker Compose, the local setup script and the Foundry preview proxy notes are removed.
- The database is an embedded PGlite database when `DATABASE_URL` is unset outside production, and PostgreSQL otherwise. The same committed migrations run on both.
- `SESSION_SIGNING_KEY` is gone. A random key is created on first start and kept in the `app_settings` table (migration `0001`).
- Sessions work inside a cross-site iframe (partitioned `SameSite=None` cookie for framed requests).
- `output: 'standalone'`, no telemetry, fonts from the bundled `@fontsource-variable/inter` package.
- Added packages: `@electric-sql/pglite`, `recharts`, `date-fns`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `sonner`.
- `next` and `eslint-config-next` moved from 16.4.0 to 16.4.2 for published security fixes.
