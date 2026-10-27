---
id: static-site
version: 1.0.0
summary: A single HTML page with inline styles and no build step.
use_when: The app is a public page or small site with no accounts, no server code and no stored data.
---

# Static site starter

One `index.html`. There is no build, no server and no database. Hermes publishes the files as they are.

## Add one feature

1. Edit `index.html`. Put new markup in `<main>`, new styles in the existing `<style>` block, and any script in one `<script>` block at the end of `<body>`.
2. Add more pages as new `.html` files next to `index.html` and link them with relative paths.
3. Put images and other assets in the same folder or a subfolder. Reference them with relative paths.
4. Stop. There is nothing to build or install.

## Rules

- Everything is public. Never put a secret, token or API key in these files.
- Do not load scripts, fonts or images from other sites. The preview has no internet access.
- The site cannot store data on a server. For accounts or saved data, start from `fastapi-crud` or `nextjs-fullstack` instead.
