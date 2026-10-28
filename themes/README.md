# Design styles

A design style gives every UI component its shape: corners, borders, shadows, density and surface. Colours, fonts, radius, shadow values and spacing come from the theme variables (tweakcn's names), so any style works with any colour preset.

Each style is one CSS file, `nextjs-fullstack/styles/style-<id>.css`. Everything in it sits under a `.style-<id>` class and styles the `cn-*` class hooks that the shadcn/ui components in `nextjs-fullstack/components/ui/` carry. The class on `<html>` picks the style.

## The 13 styles

| Id | Source | What makes it distinct |
| --- | --- | --- |
| `vega` | shadcn/ui | Clean, neutral and familiar. The starter's default. |
| `nova` | shadcn/ui | Vega with less padding and smaller gaps. |
| `maia` | shadcn/ui | Rounded, with generous spacing. |
| `lyra` | shadcn/ui | Boxy and sharp, small type. Suits mono fonts. |
| `mira` | shadcn/ui | Compact, for dense interfaces. |
| `luma` | shadcn/ui | Fluid and soft: large radii, tinted fields, soft shadows. |
| `sera` | shadcn/ui | Editorial and typographic. |
| `rhea` | shadcn/ui | Like Luma, but compact. |
| `minimal` | Hermes, from Vega | No shadows and few borders. Cards are open sections under a thin rule, fields are underlined, secondary actions are underlined text, and spacing is larger. The primary colour is the only filled accent. |
| `brutalist` | Hermes, from Vega, referencing neobrutalism-components | Square corners, 2px borders and hard 4px offset shadows in the text colour, semibold labels. Buttons press into their shadow on hover. Pair it with a saturated preset. |
| `bold` | Hermes, from Vega | Large, heavy type. Card headers are solid primary-colour blocks, controls are taller with 2px edges, badges are uppercase, and the active tab is filled. |
| `neumorphic` | Hermes, from Luma | Surfaces share one near-background colour and rise or sink through paired light and dark shadows. Fields and toggles sit in pressed wells. Every control keeps a `--input` edge, because a shadow alone does not show it. |
| `glass` | Hermes, from Luma | Translucent cards and overlays with a fixed background blur, over a soft backdrop drawn from `--primary`, `--chart-2` and `--chart-4`. Under `prefers-reduced-transparency` surfaces turn solid and the blur and backdrop go away. It shows best with a coloured preset. |

## Sources and licences

| What | Source | Commit | Licence |
| --- | --- | --- | --- |
| `vega`, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`, copied byte for byte | [shadcn-ui/ui](https://github.com/shadcn-ui/ui), `apps/v4/registry/styles/` | `ba1503c64472b82256d9de95e2e62c5901a38e8b` | MIT, Copyright (c) 2023 shadcn |
| `minimal`, `brutalist`, `bold` (from Vega), `neumorphic`, `glass` (from Luma) | the same shadcn files, copied and then changed for Hermes | same | MIT (shadcn); the changes are Hermes's own |
| Brutalist reference (classes and proportions, no code copied) | [ekmas/neobrutalism-components](https://github.com/ekmas/neobrutalism-components) | `3306a802724874a85f93079702b2795370a279d4` | MIT |

Each new style starts with a comment naming its base. The base file is copied whole, so every hook keeps a rule; the hooks that make the style distinct are rewritten. Diff a new style against its base to see exactly what changed.

A style needs a colour of its own only where its look depends on one. Each such colour is a variable that a theme can override:

- `brutalist`: borders and shadows use `--foreground`; `--brutal-shadow` (`4px 4px 0 0 var(--foreground)`).
- `neumorphic`: `--neu-surface` (background mixed 7% toward foreground), `--neu-light` and `--neu-dark` (that surface mixed with white and black), and the raised and pressed shadows built from them.
- `glass`: `--glass-surface`, `--glass-overlay`, `--glass-control` (the card, popover and background colours at 66%, 78% and 72% opacity).

No style animates continuously. Glass's blur is static and limited to cards, alerts, the empty state and overlays.

## Accessibility

Every style meets WCAG 2.2 AA with the default theme, in light and dark mode: text 4.5:1 (3:1 for large text), control edges and focus indicators 3:1, and a visible focus indicator on every keyboard stop.

shadcn's own styles miss this in a few places. Their files stay byte for byte, so `nextjs-fullstack/styles/accessible.css` fixes those places on top of any style: the focus outline on a tab panel, the edge, text and focus of an invalid field, the destructive button's focus edge, the red tint of destructive buttons in dark mode, and the field edges of Luma and Rhea.

`tools/style-check/` checks this in a real browser. CI runs it on the release build of `nextjs-fullstack`:

```sh
cd nextjs-fullstack && npm ci && npm run build && node .next/standalone/start.mjs &   # port 8080
cd tools/style-check && npm ci && npx playwright install chromium
BASE_URL=http://localhost:8080 node check.mjs            # every style; or name some: node check.mjs glass
BASE_URL=http://localhost:8080 BROWSER=webkit node check.mjs
```

For each style and mode it measures every visible text and placeholder, the edge of every field, checkbox, radio, switch and select, and the focus indicator at every Tab stop. It opens each overlay (dialog, confirmation, sheet, menu, popover, select, tooltip, toast) and measures it too. Colours are measured as the browser paints them, and translucent surfaces are checked against every colour of the gradient behind them. axe-core's colour-contrast rule runs as a second opinion. The check exits with 1 on any miss.

## The gallery

`/hermes-gallery?style=<id>&mode=light|dark` in a running preview shows every starter component in one style. It returns 404 when `APP_ENV=production`, so a published app does not serve it.

## Screenshots

The first screen of the gallery at 1280 and 375 pixels, default theme. `README=1 node tools/style-check/screenshots.mjs themes/screenshots` remakes them.

| Style | Light, 1280 | Dark, 1280 | Light, 375 | Dark, 375 |
| --- | --- | --- | --- | --- |
| `vega` | ![vega light 1280](screenshots/vega-light-1280.jpg) | ![vega dark 1280](screenshots/vega-dark-1280.jpg) | ![vega light 375](screenshots/vega-light-375.jpg) | ![vega dark 375](screenshots/vega-dark-375.jpg) |
| `nova` | ![nova light 1280](screenshots/nova-light-1280.jpg) | ![nova dark 1280](screenshots/nova-dark-1280.jpg) | ![nova light 375](screenshots/nova-light-375.jpg) | ![nova dark 375](screenshots/nova-dark-375.jpg) |
| `maia` | ![maia light 1280](screenshots/maia-light-1280.jpg) | ![maia dark 1280](screenshots/maia-dark-1280.jpg) | ![maia light 375](screenshots/maia-light-375.jpg) | ![maia dark 375](screenshots/maia-dark-375.jpg) |
| `lyra` | ![lyra light 1280](screenshots/lyra-light-1280.jpg) | ![lyra dark 1280](screenshots/lyra-dark-1280.jpg) | ![lyra light 375](screenshots/lyra-light-375.jpg) | ![lyra dark 375](screenshots/lyra-dark-375.jpg) |
| `mira` | ![mira light 1280](screenshots/mira-light-1280.jpg) | ![mira dark 1280](screenshots/mira-dark-1280.jpg) | ![mira light 375](screenshots/mira-light-375.jpg) | ![mira dark 375](screenshots/mira-dark-375.jpg) |
| `luma` | ![luma light 1280](screenshots/luma-light-1280.jpg) | ![luma dark 1280](screenshots/luma-dark-1280.jpg) | ![luma light 375](screenshots/luma-light-375.jpg) | ![luma dark 375](screenshots/luma-dark-375.jpg) |
| `sera` | ![sera light 1280](screenshots/sera-light-1280.jpg) | ![sera dark 1280](screenshots/sera-dark-1280.jpg) | ![sera light 375](screenshots/sera-light-375.jpg) | ![sera dark 375](screenshots/sera-dark-375.jpg) |
| `rhea` | ![rhea light 1280](screenshots/rhea-light-1280.jpg) | ![rhea dark 1280](screenshots/rhea-dark-1280.jpg) | ![rhea light 375](screenshots/rhea-light-375.jpg) | ![rhea dark 375](screenshots/rhea-dark-375.jpg) |
| `minimal` | ![minimal light 1280](screenshots/minimal-light-1280.jpg) | ![minimal dark 1280](screenshots/minimal-dark-1280.jpg) | ![minimal light 375](screenshots/minimal-light-375.jpg) | ![minimal dark 375](screenshots/minimal-dark-375.jpg) |
| `brutalist` | ![brutalist light 1280](screenshots/brutalist-light-1280.jpg) | ![brutalist dark 1280](screenshots/brutalist-dark-1280.jpg) | ![brutalist light 375](screenshots/brutalist-light-375.jpg) | ![brutalist dark 375](screenshots/brutalist-dark-375.jpg) |
| `bold` | ![bold light 1280](screenshots/bold-light-1280.jpg) | ![bold dark 1280](screenshots/bold-dark-1280.jpg) | ![bold light 375](screenshots/bold-light-375.jpg) | ![bold dark 375](screenshots/bold-dark-375.jpg) |
| `neumorphic` | ![neumorphic light 1280](screenshots/neumorphic-light-1280.jpg) | ![neumorphic dark 1280](screenshots/neumorphic-dark-1280.jpg) | ![neumorphic light 375](screenshots/neumorphic-light-375.jpg) | ![neumorphic dark 375](screenshots/neumorphic-dark-375.jpg) |
| `glass` | ![glass light 1280](screenshots/glass-light-1280.jpg) | ![glass dark 1280](screenshots/glass-dark-1280.jpg) | ![glass light 375](screenshots/glass-light-375.jpg) | ![glass dark 375](screenshots/glass-dark-375.jpg) |
