// The parts of hermes-theme.json the layout needs. Hermes checks the whole file when it writes
// it; this only makes a broken file fail the build instead of rendering an unstyled page. Plain
// checks rather than Zod keep Zod out of every page's first compile in `next dev`.
const modes = ["system", "light", "dark"] as const;

export type ThemeMode = (typeof modes)[number];

const isMode = (value: unknown): value is ThemeMode => modes.some((mode) => mode === value);

export function readTheme(file: unknown) {
  const style = typeof file === "object" && file !== null && "style" in file ? file.style : undefined;
  const mode = typeof file === "object" && file !== null && "mode" in file ? file.mode : undefined;
  if (typeof style !== "string" || !/^[a-z]+$/.test(style)) {
    throw new Error("hermes-theme.json: style must be a style id such as vega");
  }
  if (!isMode(mode)) throw new Error("hermes-theme.json: mode must be system, light or dark");
  return { style, mode };
}

export function htmlClass(style: string, mode: ThemeMode, fontVariables: string) {
  return [`style-${style}`, mode === "dark" ? "dark" : "", fontVariables].filter(Boolean).join(" ");
}
