import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { htmlClass, readTheme } from "../../lib/theme";

const root = path.join(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

// The custom properties declared directly inside `selector { ... }`.
function block(css: string, selector: string) {
  const start = css.indexOf(`\n${selector} {\n`);
  assert.notEqual(start, -1, `no ${selector} block`);
  const body = css.slice(start, css.indexOf("\n}\n", start));
  return Object.fromEntries([...body.matchAll(/^ {2}(--[a-z0-9-]+): (.+);$/gm)].map((m) => [m[1], m[2]]));
}

test("app/theme.css holds exactly the values in hermes-theme.json", () => {
  const theme = JSON.parse(read("hermes-theme.json"));
  const css = read("app/theme.css");
  const colours = (mode: Record<string, string>) =>
    Object.fromEntries(Object.entries(mode).map(([key, value]) => [`--${key}`, value]));

  assert.equal(theme.style, "vega");
  assert.match(css, /^\/\* Generated from hermes-theme\.json\. Change that file instead\. \*\/\n@import "\.\.\/styles\/style-vega\.css";\n/);
  assert.deepEqual(block(css, ":root"), {
    ...colours(theme.light),
    "--font-sans": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
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
  assert.deepEqual(block(css, ".dark"), colours(theme.dark));
  assert.match(css, /:root \{\n {2}color-scheme: light;\n/);
  assert.match(css, /\.dark \{\n {2}color-scheme: dark;\n/);
});

test("the default theme keeps the starter's original look", () => {
  const theme = JSON.parse(read("hermes-theme.json"));
  assert.deepEqual(
    { style: theme.style, preset: theme.preset, mode: theme.mode, fonts: theme.fonts },
    { style: "vega", preset: "neutral", mode: "system", fonts: { sans: "inter", serif: "system-serif", mono: "system-mono" } },
  );
  assert.equal(theme.light.input, "oklch(0.62 0 0)");
  assert.equal(theme.light.ring, "oklch(0.35 0 0)");
  assert.equal(theme.light["muted-foreground"], "oklch(0.45 0 0)");
  assert.equal(theme.dark.border, "oklch(1 0 0 / 12%)");
  assert.equal(Object.keys(theme.light).length, 32);
  assert.deepEqual(Object.keys(theme.dark), Object.keys(theme.light));
});

test("every bundled font of the theme contract has a --font-<id> variable", () => {
  const variables = [...read("app/fonts.ts").matchAll(/variable: "--font-([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(variables, [
    "inter",
    "geist",
    "dm-sans",
    "space-grotesk",
    "montserrat",
    "lora",
    "playfair-display",
    "jetbrains-mono",
    "geist-mono",
  ]);
});

test("the layout reads the style and the mode", () => {
  assert.deepEqual(readTheme({ style: "lyra", mode: "dark", extra: 1 }), { style: "lyra", mode: "dark" });
  assert.throws(() => readTheme({ style: "vega", mode: "dim" }));
  assert.throws(() => readTheme({ style: "vega x", mode: "light" }));
  assert.equal(htmlClass("lyra", "dark", "a b"), "style-lyra dark a b");
  assert.equal(htmlClass("vega", "system", "a"), "style-vega a");
  assert.equal(htmlClass("vega", "light", "a"), "style-vega a");
});
