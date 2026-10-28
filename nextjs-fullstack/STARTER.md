---
id: nextjs-fullstack
version: 1.0.0
summary: Next.js App Router with app-owned email and password accounts, teams, and a database that works with no setup.
use_when: The app is a browser application with sign-in, server routes and saved data, such as a tracker, a dashboard or an internal tool.
---

# Next.js full-stack starter

Use this starter for a browser application that needs a TypeScript frontend, server routes, app-owned accounts, and database persistence.

## What is included

- Next.js App Router and React.
- Email/password signup, signin, signout, and signed HTTP-only sessions. Sessions also work when the app is shown in an iframe on another site.
- A protected dashboard with team membership, profile, password, and activity views.
- Drizzle schema and committed additive migrations. The database is an embedded PGlite database when `DATABASE_URL` is unset and `APP_ENV` is not `production`, and PostgreSQL when `DATABASE_URL` is set. With `APP_ENV=production` and no `DATABASE_URL` the app refuses to start. The same migrations run on both. This is wider than the Hermes plan, which names only previews: local development without `DATABASE_URL` also uses PGlite.
- A session signing key that the app creates on first start and keeps in the `app_settings` table. There is nothing to configure.
- A startup migration runner guarded by a bounded PostgreSQL advisory lock.
- Unit tests and an HTTP integration suite that runs on PGlite and on PostgreSQL.
- A UI built from shadcn/ui components (Vega style, Radix primitives) in `components/ui/`, themed by CSS variables in `app/globals.css`. Light and dark follow the system setting. Shadows come from six base variables (`--shadow-color`, `--shadow-opacity`, `--shadow-blur`, `--shadow-spread`, `--shadow-offset-x`, `--shadow-offset-y`) and the shadow scale is derived from them.
- Packages for charts (`recharts`), dates (`date-fns`), forms (`react-hook-form`, `@hookform/resolvers`), tables (`@tanstack/react-table`) and toasts (`sonner`, with its `Toaster` already mounted once in `app/layout.tsx`, so call `toast()` from a Client Component). They are installed, so import them as needed. The shadcn/ui components need `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` and `tw-animate-css`, which are installed. No other package can be added in a preview or build, because there is no network.

The starter does not include billing, password recovery, email delivery, external connectors, or cloud provisioning. Add only what the project needs. Application passwords and sessions identify users of this app only. Never reuse them as credentials for a connector or external service.

## Fast path: add one feature

This guide is everything you need. Do not re-read the starter's files to rediscover it. For a basic feature such as a tracker or list, change only these places:

1. **Table:** add it to `lib/server/db/schema.ts` with `userId` (and `teamId` if shared) referencing the existing tables. Run `npm run db:generate` to create the next migration in `drizzle/`. Do not edit `0000_initial.sql` or `0001_app_settings.sql`. Check the new SQL file only adds your table (generated SQL for earlier tables means the snapshot is stale).
2. **Page:** make `app/(dashboard)/dashboard/page.tsx` the feature's main screen, or add `app/(dashboard)/dashboard/<feature>/page.tsx` and a link in the `navigation` list in `components/dashboard-nav.tsx`. Start with `const context = await requirePageUser();` and query only rows where `userId = context.user.id`.
3. **UI:** build the screen from the components already in `components/ui/`: `Card` (with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `Table`, `Button`, `Badge`, `Alert` (use `components/form-message.tsx` for the `error` and `success` text), `Empty` for empty lists, `Skeleton` for loading (a plain muted block; keep motion out of the starter), `Avatar` (use `initials()` from `lib/initials.ts` for its text), `Separator`, and `FieldGroup`, `Field`, `FieldLabel`, `Input` for form fields. Also in `components/ui/`: `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Dialog`, `AlertDialog` (confirm a destructive action, see `components/remove-member-dialog.tsx`), `Tabs`, `DropdownMenu`, `Tooltip`, `Popover`, `Sheet` and the `Toaster` from `sonner.tsx`. For a form that can fail, show errors with `components/form-message.tsx`, pass `fields` to `formRedirect` so the page can mark the wrong inputs: build the set with `invalidFields(fields, [...allowed names])` from `lib/http.ts`, then spread `fieldErrorProps` (from `lib/form-errors.ts`) on each input, and let long names wrap (`wrap-anywhere`) instead of truncating them. Copy the shape of `app/(dashboard)/dashboard/general/page.tsx` for a form and `app/(dashboard)/dashboard/page.tsx` for a table. Do not add packages: there is no network, and the CLI cannot run. Never write a colour, font or radius into a component. Use the semantic classes (`bg-background`, `text-muted-foreground`, `bg-primary`, `border`, `rounded-lg`), which read the theme variables in `app/globals.css`. To restyle the whole app, change those variables (they use tweakcn's names, for light and under `.dark`). The style class `style-vega` on `<html>` in `app/layout.tsx` gives every component its shape from `styles/style-vega.css`; leave both files alone.
4. **Writes:** add `app/api/<feature>/route.ts` modelled on `app/api/account/profile/route.ts`: `parseFormRequest`, then `requestUserContext` (redirect to `/sign-in` if empty), then a Zod schema from `lib/validation.ts`, then the write scoped to `context.user.id`, then `formRedirect` back with `success` or `error`. Plain HTML forms that post to the route are enough; no client state library is needed.
5. **Stop:** finish once the code is in place. The preview starts by itself and applies migrations on start; the checks below are optional follow-ups the person can ask for.

Leave sign-in, sign-up, profile, security, activity, not-found, and their styles unchanged unless the request asks for them. Leave `app/hermes-gallery/` alone too: it is a preview-only page for reviewing design styles, and published apps do not serve it. They already work and pass the integration suite.

## Local setup

Requirements: Node 24+ and npm. No database needs to be installed.

```sh
npm ci
npm run dev
```

`npm run dev` applies migrations first, then starts Next.js on <http://localhost:3000>. Data is stored in `./.data/pglite` (or `$DATA_DIR/pglite`). The folder is created on first start. Delete it to start fresh.

To use PostgreSQL, set `DATABASE_URL` (see `.env.example`).

## Environment

| Name | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL URL. When unset and `APP_ENV` is not `production`, the app uses PGlite. |
| `APP_ENV` | `production` makes `DATABASE_URL` required. The app refuses to start without it. |
| `DATA_DIR` | Writable folder for PGlite. Default `./.data`. It and its parents are created when missing. |
| `PORT` | Port of the release server (`npm start`). Default `8080`. It listens on `0.0.0.0`. `npm run dev` uses Next's default, 3000. |
| `SESSION_COOKIE_SECURE` | Set to `false` only for plain HTTP on a host that is not `localhost` or `*.localhost`. Cookies then use `SameSite=Lax` and do not work inside an iframe. |

Hermes sets `APP_ENV`, `DATA_DIR` and `DATABASE_URL` for you. Do not define variables that start with `HERMES_` or are named `APP_ENV`, `PORT`, `HOME`, `PATH` or `DATA_DIR`.

## Release form

```sh
npm ci
npm run build
npm start
```

`npm run build` leaves a complete release folder in `.next/standalone`. It holds the server, the static files, the migrations and `start.mjs`. Copy that one folder anywhere and run it with Node 24 and no other files:

```sh
cd standalone && node start.mjs
```

`start.mjs` refuses to run with `APP_ENV=production` and no `DATABASE_URL` (exit code 1). Otherwise it applies migrations and creates the session key under the migration lock, then starts the server on `$PORT` (default 8080). `npm start` runs the same file from `.next/standalone`.

## Checks

During a Hermes build, do not run this list. Let the preview start, then mention these as optional checks the person can ask for.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
```

`build` needs no database. Runtime paths fail closed when configuration is missing.

`test:integration` needs a finished `npm run build`. Without `DATABASE_URL` it runs on PGlite in a temporary folder. With `DATABASE_URL` set it runs on that PostgreSQL database and removes the rows it created. It starts and stops the built production app itself.

## Extending the starter

- Put secret-dependent code under `lib/server/` and keep it out of Client Components.
- Validate every request at runtime. TypeScript types do not validate network data.
- Call the server authorization helpers in every protected route or mutation. UI visibility is not authorization.
- Scope database writes to the signed-in user and their team. Never trust a browser-supplied user or team ID.
- Add a new numbered SQL migration for every schema change. Do not edit a migration already used by another environment. Write SQL that runs on both PGlite and PostgreSQL (plain DDL and `insert` are fine; avoid extensions).
- Keep `GET /api/healthz` as process liveness only. It does not prove database readiness.
- Sign-in and sign-up have no rate limit in the app. Add one at the trusted edge before public launch.
- Keep embedding support. Do not add `X-Frame-Options: DENY` or a `frame-ancestors` rule that blocks the Hermes preview.
- Do not load fonts or images from other sites. Fonts come from `@fontsource-variable/inter` through `next/font/local`.

`start.mjs` applies migrations and creates the session key before it starts the server, so its database identity needs schema-write rights. Rotating the session key is not supported.
