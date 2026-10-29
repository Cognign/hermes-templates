---
id: static-site
version: 1.0.0
summary: A single HTML page with inline styles and no build step.
use_when: The app is a public page or small site with no accounts, no server code and no stored data.
---

# Static site starter

One `index.html`, with its look in `theme.css`. There is no build, no server and no database. Hermes publishes the files as they are.

## Add one feature

1. Edit `index.html`. Put new markup in `<main>`, new styles in the existing `<style>` block, and any script in one `<script>` block at the end of `<body>`. Style with the theme variables (`var(--background)`, `var(--primary)`, `var(--muted-foreground)`, `var(--radius)`, `var(--font-sans)` and the rest in `theme.css`), never with fixed colours, fonts or radii. New pages link `theme.css` the same way.
2. Add more pages as new `.html` files next to `index.html` and link them with relative paths.
3. Put images and other assets in the same folder or a subfolder. Reference them with relative paths.
4. Stop. There is nothing to build or install.

## Rules

- The look comes from `hermes-theme.json`, rendered into `theme.css`. Change it with the `set_theme` tool. Never edit `theme.css` by hand. Fonts are always the system fonts.
- Keep the `hermes-live-theme.js` script tag. It lets the Hermes Design panel show theme changes in the preview at once.

- Everything is public. Never put a secret, token or API key in these files.
- Do not load scripts, fonts or images from other sites. The preview has no internet access.
- The site cannot store data on a server. For accounts or saved data, start from `fastapi-crud` or `nextjs-fullstack` instead.
