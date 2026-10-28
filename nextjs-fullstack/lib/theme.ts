import { z } from "zod";

// The parts of hermes-theme.json the layout needs. Hermes checks the whole file when it writes
// it; this only makes a broken file fail the build instead of rendering an unstyled page.
const themeShape = z.object({
  style: z.string().regex(/^[a-z]+$/),
  mode: z.enum(["system", "light", "dark"]),
});

export type ThemeMode = z.infer<typeof themeShape>["mode"];

export function readTheme(file: unknown) {
  return themeShape.parse(file);
}

export function htmlClass(style: string, mode: ThemeMode, fontVariables: string) {
  return [`style-${style}`, mode === "dark" ? "dark" : "", fontVariables].filter(Boolean).join(" ");
}
