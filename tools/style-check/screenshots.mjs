// Saves a full-page screenshot of the gallery for each style, mode and width.
// Usage: BASE_URL=http://localhost:3000 node screenshots.mjs <out-dir> [style ...]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";
import { styleIds, galleryUrl, hideDevBadge, waitForStyle } from "./gallery.mjs";

const [outDir = "screenshots", ...only] = process.argv.slice(2);
const styles = only.length ? only : styleIds;
const engine = process.env.BROWSER === "webkit" ? webkit : chromium;
const widths = [1280, 375];

await mkdir(outDir, { recursive: true });
const browser = await engine.launch();
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    for (const style of styles) {
      for (const mode of ["light", "dark"]) {
        await page.goto(galleryUrl(style, mode));
        await waitForStyle(page, style, mode);
        await hideDevBadge(page);
        const file = path.join(outDir, `${style}-${mode}-${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
