const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Avatar text: the first letter of the first two words, uppercase where the
 * script has case. Splits on graphemes so an emoji or an accented letter is
 * never cut in half.
 */
export function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => graphemes.segment(word)[Symbol.iterator]().next().value?.segment ?? "")
    .join("")
    .toLocaleUpperCase();
}
