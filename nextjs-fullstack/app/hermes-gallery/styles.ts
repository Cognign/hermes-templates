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
] as const;

export type StyleId = (typeof styleIds)[number];
export type Mode = "light" | "dark";

export function isStyleId(value: unknown): value is StyleId {
  return styleIds.some((id) => id === value);
}

export function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}
