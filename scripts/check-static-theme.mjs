#!/usr/bin/env node
// Checks that static-site/theme.css holds exactly the values in static-site/hermes-theme.json, in
// the format of the theme contract (system mode), and that both starters ship the same live theme
// script. Hermes writes these files; this catches a hand edit or a stale copy.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const theme = JSON.parse(read("static-site/hermes-theme.json"));
const css = read("static-site/theme.css");

const declarations = (text) =>
  Object.fromEntries([...text.matchAll(/^\s+(--[a-z0-9-]+): (.+);$/gm)].map((m) => [m[1], m[2]]));
const colours = (mode) => Object.fromEntries(Object.entries(mode).map(([key, value]) => [`--${key}`, value]));

assert.equal(theme.mode, "system", "the starter's theme follows the system setting");
const [light, dark] = css.split("@media (prefers-color-scheme: dark) {");
assert.ok(dark, "theme.css needs a prefers-color-scheme: dark block");
assert.deepEqual(declarations(light), {
  ...colours(theme.light),
  "--font-sans": "ui-sans-serif, system-ui, sans-serif",
  "--font-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  "--radius": theme.radius,
  "--shadow-color": theme.shadow.color,
  "--shadow-opacity": String(theme.shadow.opacity),
  "--shadow-blur": theme.shadow.blur,
  "--shadow-spread": theme.shadow.spread,
  "--shadow-offset-x": theme.shadow.offsetX,
  "--shadow-offset-y": theme.shadow.offsetY,
  "--tracking-normal": theme.letterSpacing,
  "--spacing": theme.spacing,
});
assert.deepEqual(declarations(dark), colours(theme.dark));
assert.equal(
  read("static-site/hermes-live-theme.js"),
  read("nextjs-fullstack/public/hermes-live-theme.js"),
  "both starters must ship the same hermes-live-theme.js",
);
console.log("static-site theme: ok");
