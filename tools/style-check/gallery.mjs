// Shared by the check and the screenshot script. The ids match
// nextjs-fullstack/app/hermes-gallery/styles.ts.
export const styleIds = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
  "minimal",
  "brutalist",
  "bold",
  "neumorphic",
  "glass",
];

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

export function galleryUrl(style, mode) {
  return `${baseUrl}/hermes-gallery?style=${style}&mode=${mode}`;
}

/**
 * The gallery sets the style class after hydration, which starts colour
 * transitions, so wait for the class, the fonts and every running transition.
 */
export async function waitForStyle(page, style, mode) {
  await page.waitForFunction(
    ([style, dark]) => {
      const root = document.documentElement.classList;
      return root.contains(`style-${style}`) && root.contains("dark") === dark;
    },
    [style, mode === "dark"],
  );
  await settle(page);
}

export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
}

/** Hides the `next dev` badge so screenshots show only the app. */
export async function hideDevBadge(page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}
