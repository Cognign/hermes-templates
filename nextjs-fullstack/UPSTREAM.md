# Upstream sources and adaptations

This starter is an adapted copy of two projects, both MIT licensed. The UI components also come from a third (see the end).

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
- The database is an embedded PGlite database when `DATABASE_URL` is unset and `APP_ENV` is not `production`, and PostgreSQL otherwise. The unit plan worded this more narrowly (PGlite for previews only); this is what is built, and with `APP_ENV=production` and no `DATABASE_URL` the app refuses to start. The same committed migrations run on both.
- `SESSION_SIGNING_KEY` is gone. A random key is created on first start and kept in the `app_settings` table (migration `0001`).
- Sessions work inside a cross-site iframe (partitioned `SameSite=None` cookie for framed requests).
- `output: 'standalone'`, and `npm run build` turns `.next/standalone` into a release folder that starts with plain Node (`start.mjs`, built from `scripts/serve.ts` with esbuild). No telemetry, fonts from the bundled `@fontsource-variable/inter` package.
- Added packages: `@electric-sql/pglite`, `recharts`, `date-fns`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `sonner`.
- `next` and `eslint-config-next` moved from 16.4.0 to 16.4.2 for published security fixes.
- The UI is rebuilt from shadcn/ui. No change to routes, form fields, redirects or messages.
- Added packages: `radix-ui` 1.8.1, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0. Every entry in `package-lock.json` was published on or before 2026-10-20.

## shadcn/ui components and the Vega style

- Repository: <https://github.com/shadcn-ui/ui>
- Source commit: `ba1503c64472b82256d9de95e2e62c5901a38e8b` (main, 2026-10-19). Licence: MIT, Copyright (c) 2023 shadcn.
- CLI used to inspect the flow: `shadcn@4.22.1` (published 2026-10-18).
- Files copied unchanged except for imports:
  - `components/ui/*.tsx` from `apps/v4/registry/bases/radix/ui/` (Radix base). These keep shadcn's `cn-*` class hooks. The only edits: `import { cn } from "cn"` became `"@/lib/utils"` and the `field` imports point to `@/components/ui/`.
  - `styles/style-vega.css` from `apps/v4/registry/styles/style-vega.css`. It styles every `cn-*` hook, scoped to `.style-vega`.
  - `styles/shadcn-tailwind.css` from `packages/shadcn/src/tailwind.css`. This is what `@import "shadcn/tailwind.css"` loads; vendoring it avoids installing the whole `shadcn` CLI package.
- Why the files are copied instead of made by `shadcn init`: in this version `init` writes the style into each component's class list and drops the `cn-*` hooks, and its generated `lib/utils.ts` imports a `cn` npm package that is not part of the approved set. The hook form is what lets one style file be swapped later.
- Also copied from the same commit, with the same import rewrites: `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `dialog`, `alert-dialog`, `tabs`, `dropdown-menu`, `tooltip`, `popover`, `sheet` and `sonner`. Further edits: the `IconPlaceholder` helper (which only exists inside shadcn's own site) is replaced by the lucide icon it names; `sonner.tsx` uses `theme="system"` instead of `next-themes`, and its loading icon does not spin; `skeleton.tsx` has no pulse animation. No new packages.
- `app/globals.css` sets the theme variables with tweakcn's names (<https://github.com/jnsahaj/tweakcn>, `types/theme.ts`, Apache-2.0), including `--destructive-foreground`. The shadow scale follows the logic of `utils/shadows.ts` from tweakcn at commit `a3b47b37cba97dd637de517aab52c45ec0f83456` (Apache-2.0, <https://github.com/jnsahaj/tweakcn/blob/a3b47b37cba97dd637de517aab52c45ec0f83456/utils/shadows.ts>): the same multipliers and second layers, written as CSS (`color-mix`, `calc`) instead of TypeScript. tweakcn's Apache-2.0 licence applies to that adapted logic. Its full text ships as `LICENSE-APACHE-2.0`, and the comment above the shadow scale in `app/globals.css` says what changed.
- Outline buttons use `--input` for their border in light mode too (a small rule at the end of `app/globals.css`), because Vega's `--border` is a 1.3:1 divider colour. Neutral base colour. `--input` and `--ring` are darker than shadcn's neutral defaults so input borders and focus rings reach 3:1 contrast.
- Updating means: re-copy the files from a newer commit, and rerun the lock date check and the visual check.
