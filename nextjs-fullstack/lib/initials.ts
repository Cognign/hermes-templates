const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Avatar text: the first letter, number or emoji of the first two words that have one (punctuation such as "(" is skipped), uppercase where the
 * script has case. Splits on graphemes so an emoji or an accented letter is
 * never cut in half.
 */
const lead = /^[\p{L}\p{N}\p{Extended_Pictographic}]/u;

export function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((word) => [...graphemes.segment(word)].find(({ segment }) => lead.test(segment))?.segment ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase();
}
