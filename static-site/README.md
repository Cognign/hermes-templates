# Static App Template

This is the standard template for static websites built on Hermes.

## Architecture and Security Rules

Static sites follow simple isolation rules (see `docs/engineering/rules.md`):

- **Independent origin (`SEC-*`):** Every static site is published on its own distinct origin (domain or subdomain). This isolates it completely from the Hermes platform origin and other tenant applications.
- **No secrets (`SEC-*`):** Static sites contain only public HTML, CSS, JavaScript, and static assets. No secrets, tokens, or environment keys may be bundled or exposed.
- **No platform credentials (`SEC-*`):** The site never receives or stores Hermes platform credentials or internal administrative access.
