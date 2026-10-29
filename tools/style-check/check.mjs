// Checks every design style in the gallery, in light and dark mode, against
// WCAG 2.2 AA: text 4.5:1 (3:1 for large text), control edges 3:1, and a
// visible focus indicator of at least 3:1 on every keyboard stop.
// axe-core's colour-contrast rule runs as a second opinion on text.
// Usage: BASE_URL=http://localhost:3000 node check.mjs [style ...]
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright";
import { auditContrast, auditFocused, installTools, snapshotFocusables } from "./audit.mjs";
import { galleryUrl, settle, styleIds, waitForStyle } from "./gallery.mjs";

const only = process.argv.slice(2);
const styles = only.length ? only : styleIds;
const engine = process.env.BROWSER === "webkit" ? webkit : chromium;
// Safari's Tab skips buttons and links unless Option is held.
const tabKey = engine === webkit ? "Alt+Tab" : "Tab";
const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

// Each overlay: how to open it, and the element that holds its content.
const overlays = [
  { name: "dialog", open: (p) => p.getByRole("button", { name: "Open dialog" }).click(), scope: "[role=dialog]" },
  { name: "confirmation", open: (p) => p.getByRole("button", { name: "Open confirmation" }).click(), scope: "[role=alertdialog]" },
  { name: "sheet", open: (p) => p.getByRole("button", { name: "Open sheet" }).click(), scope: "[role=dialog]" },
  { name: "menu", open: (p) => p.getByRole("button", { name: "Open menu" }).click(), scope: "[role=menu]" },
  { name: "popover", open: (p) => p.getByRole("button", { name: "Open popover" }).click(), scope: "[data-slot=popover-content]" },
  { name: "select", open: (p) => p.getByRole("combobox", { name: "Summary email" }).click(), scope: "[role=listbox]" },
  { name: "tooltip", open: (p) => p.getByRole("button", { name: "Hover for a tooltip" }).hover(), scope: "[data-slot=tooltip-content]" },
  { name: "toast", open: (p) => p.getByRole("button", { name: "Show a toast" }).click(), scope: "[data-sonner-toast]" },
];

const browser = await engine.launch();
let failed = 0;
try {
  for (const style of styles) {
    for (const mode of ["light", "dark"]) {
      const failures = await checkOne(style, mode);
      failed += failures.length;
      for (const f of failures) console.log(`  FAIL ${style}/${mode} ${f}`);
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} problem(s) found.` : "\nEvery style passed.");
process.exitCode = failed ? 1 : 0;

async function checkOne(style, mode) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const failures = [];
  try {
    await page.goto(galleryUrl(style, mode));
    await waitForStyle(page, style, mode);
    // A viewport as tall as the page lets every element be hit-tested without scrolling.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 1280, height });
    await settle(page);
    await page.addScriptTag({ content: axeSource });
    await page.evaluate(installTools);

    const main = await page.evaluate(auditContrast, "body > :not([data-sonner-toaster])");
    failures.push(...describe(main.failures), ...(await axeFailures(page, "body")));

    const stops = await keyboardPass(page);
    failures.push(...stops.filter((s) => s.ratio < 3).map((s) => `focus ${s.at}: ${s.indicator} ${s.ratio.toFixed(2)}:1, needs 3:1`));

    const states = await pointerStates(page);
    failures.push(...states.failures);

    let overlayTexts = 0;
    for (const overlay of overlays) {
      await overlay.open(page);
      await page.locator(overlay.scope).first().waitFor();
      await settle(page);
      const result = await page.evaluate(auditContrast, overlay.scope);
      overlayTexts += result.texts;
      if (!result.texts) failures.push(`${overlay.name}: no text found to check`);
      failures.push(...describe(result.failures, overlay.name), ...(await axeFailures(page, overlay.scope, overlay.name)));
      await page.keyboard.press("Escape");
      await page.mouse.move(0, 0);
      await page.locator(`${overlay.scope}:not([data-sonner-toast])`).waitFor({ state: "detached" }).catch(() => {});
    }
    console.log(
      `${failures.length ? "FAIL" : "ok  "} ${style}/${mode}: ${main.texts} texts (lowest ${main.lowestText.toFixed(2)}:1), ` +
        `${main.edges} control edges, ${stops.length} focus stops, ${states.measured} hover/pressed states, ${overlays.length} overlays (${overlayTexts} texts)`,
    );
  } finally {
    await page.close();
  }
  return failures;
}

function describe(list, where = "page") {
  return list.map((f) => `${where} ${f.kind} ${f.at}: ${f.ratio.toFixed(2)}:1, needs ${f.needed}:1`);
}

async function axeFailures(page, scope, where = "page") {
  const violations = await page.evaluate(
    async (scope) => (await window.axe.run(scope, { runOnly: ["color-contrast"] })).violations,
    scope,
  );
  return violations.flatMap((v) => v.nodes.map((n) => `${where} axe ${v.id} ${n.target.join(" ")}: ${n.any[0]?.message ?? ""}`));
}

/**
 * Hovers, then presses, every enabled button and link on the page and checks
 * its text contrast in that state, because a style can change the fill on
 * :hover or :active. The press is released away from the control so it never
 * fires a click.
 */
async function pointerStates(page) {
  const failures = [];
  let measured = 0;
  const targets = page.locator("body > :not([data-sonner-toaster]) :is(button, a[href]):visible:not(:disabled, [aria-disabled=true])");
  const count = await targets.count();
  for (let i = 0; i < count; i++) {
    const target = targets.nth(i);
    const name = (await target.innerText()).trim().slice(0, 40) || (await target.getAttribute("aria-label")) || `#${i}`;
    await target.hover();
    for (const state of ["hover", "pressed"]) {
      if (state === "pressed") await page.mouse.down();
      await settle(page);
      await target.evaluate((el) => el.setAttribute("data-style-check-state", ""));
      const result = await page.evaluate(auditContrast, "[data-style-check-state]");
      const axe = await axeFailures(page, "[data-style-check-state]", `${state} "${name}"`);
      await target.evaluate((el) => el.removeAttribute("data-style-check-state"));
      measured++;
      failures.push(...describe(result.failures, `${state} "${name}"`), ...axe);
    }
    await page.mouse.move(0, 0);
    await page.mouse.up();
    // Radix menus and selects open on pointer down, before the release.
    if (await target.evaluate((el) => el.hasAttribute("aria-haspopup") || el.getAttribute("aria-expanded") === "true")) {
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== "none");
    }
  }
  if (count === 0) throw new Error("The hover pass found no buttons or links.");
  return { measured, failures };
}

/** Tabs through the page until focus comes back round, checking each stop. */
async function keyboardPass(page) {
  await page.evaluate(snapshotFocusables);
  const stops = [];
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    await page.keyboard.press(tabKey);
    await settle(page);
    const stop = await page.evaluate(auditFocused);
    if (!stop) continue;
    if (seen.has(stop.id)) break;
    seen.add(stop.id);
    stops.push(stop);
  }
  if (stops.length === 0) throw new Error("The keyboard pass reached no control.");
  return stops;
}
