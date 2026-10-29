// Saves a screenshot of the gallery for each style, mode and width: full-page
// PNGs, or with README=1 the first screen as small JPEGs for themes/README.md.
// Usage: BASE_URL=http://localhost:3000 [README=1] node screenshots.mjs <out-dir> [style ...]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";
import { styleIds, galleryUrl, hideDevBadge, waitForStyle } from "./gallery.mjs";

const [outDir = "screenshots", ...only] = process.argv.slice(2);
const styles = only.length ? only : styleIds;
const engine = process.env.BROWSER === "webkit" ? webkit : chromium;
const readme = process.env.README === "1";
const sizes = [
  { width: 1280, height: 1000 },
  { width: 375, height: 812 },
];

await mkdir(outDir, { recursive: true });
const browser = await engine.launch();
try {
  for (const viewport of sizes) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    for (const style of styles) {
      for (const mode of ["light", "dark"]) {
        await page.goto(galleryUrl(style, mode));
        await waitForStyle(page, style, mode);
        await hideDevBadge(page);
        const file = path.join(outDir, `${style}-${mode}-${viewport.width}.${readme ? "jpg" : "png"}`);
        await page.screenshot(readme ? { path: file, type: "jpeg", quality: 80 } : { path: file, fullPage: true });
        console.log(file);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
