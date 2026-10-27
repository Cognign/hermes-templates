# Hermes templates

Starter apps that the Hermes assistant copies into a new app and then extends.

## How Hermes uses this repository

- Hermes pins this repository as a git submodule at a reviewed commit.
- The templates are copied into Hermes images when they are built. Nothing downloads this repository at runtime.
- When an app starts from a template, its files are copied into the app. The app keeps them. A later change here does not update existing apps.
- Each template's lock file is the approved package set. Apps cannot install packages from the network, so a package that is not in the lock file cannot be used.

## Templates

| Folder | Registry id | Use it for | Database |
| --- | --- | --- | --- |
| [`static-site/`](static-site) | `static-site@1.0.0` | A public page or small site, no server code | none |
| [`fastapi-crud/`](fastapi-crud) | `fastapi-crud@1.0.0` | A Python JSON API with its own data | PostgreSQL (`DATABASE_URL`) |
| [`nextjs-fullstack/`](nextjs-fullstack) | `nextjs-fullstack@1.0.0` | A browser app with sign-in, server routes and saved data | PGlite with no setup, PostgreSQL when `DATABASE_URL` is set |

Every template folder holds:

- the code and its lock file (`uv.lock` or `package-lock.json`);
- `STARTER.md`, with front matter (`id`, `version`, `summary`, `use_when`) that Hermes reads to list templates, and a short guide for adding one feature;
- `hermes-app.json`, the declaration copied into new apps (`template`, and `integrations` when the app needs a database);
- `LICENSE`, and `UPSTREAM.md` when the code is adapted from outside.

## Checking a template

Run these from the template's folder. CI (`.github/workflows/quality.yml`) runs the same steps.

| Template | Commands |
| --- | --- |
| all | `scripts/check-template.sh <folder>` from the repository root |
| `static-site` | none beyond the file check |
| `fastapi-crud` | `uv sync --frozen`, `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright`, `uv run pytest` (uv 0.12.8, Python 3.13) |
| `nextjs-fullstack` | `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:integration` (Node 24.21.0). The integration suite runs on PGlite by default. Set `DATABASE_URL` to run it on PostgreSQL 17. |

## Adding a template

1. Create a folder named after its registry id, for example `my-template/`.
2. Add the code, a lock file with exact versions, `STARTER.md` (with front matter and a short "add one feature" guide), `hermes-app.json` (`{"template":"my-template@1.0.0"}`) and `LICENSE`. Add `UPSTREAM.md` when you adapt outside code. It records the source URL, the commit and the licence.
3. Use only packages that were published at least 7 days ago. Pin exact versions.
4. The app must listen on the port Hermes gives it, read configuration from the environment, and avoid network access at build time. Do not use the names `APP_ENV`, `PORT`, `PYTHONPATH`, `HOME`, `PATH`, `DATA_DIR` or the `HERMES_` prefix for your own variables.
5. Add a job for it to `.github/workflows/quality.yml`. Pin every action to a full commit SHA.
6. Add the template to the registry in Hermes (`packages/contracts/src/app-templates.ts`) in a separate Hermes pull request after this one merges.

## Licence

[MIT](LICENSE). Each template keeps its own licence and upstream notices: `nextjs-fullstack` is adapted from [team8solutions/foundry-templates](https://github.com/team8solutions/foundry-templates) and Vercel's [nextjs/saas-starter](https://github.com/nextjs/saas-starter), both MIT (see `nextjs-fullstack/UPSTREAM.md`).
