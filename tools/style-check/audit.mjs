// Runs inside the page (passed to page.evaluate), so it must not use imports.
// Colours are resolved by painting them on a canvas, which handles every CSS
// colour syntax the browser knows (oklch, color-mix, relative colours).

/** Text, placeholder and control-edge contrast inside `scope` (a CSS selector). */
export function auditContrast(scope) {
  const { toRgba, backgroundsAt, shadowLayers, label, isDisabled, isHidden, minAgainst } = window.__styleCheckTools;
  const roots = [...document.querySelectorAll(scope)];
  const failures = [];
  let texts = 0;
  let edges = 0;
  let lowestText = Infinity;

  for (const el of roots.flatMap((root) => [root, ...root.querySelectorAll("*")])) {
    if (isHidden(el) || isDisabled(el)) continue;
    const style = getComputedStyle(el);
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const placeholder = (el.matches("input, textarea") && !el.value && el.placeholder) || "";
    if (ownText || placeholder) {
      const color = toRgba(placeholder ? getComputedStyle(el, "::placeholder").color : style.color);
      color[3] *= effectiveOpacity(el);
      const rect = el.getBoundingClientRect();
      const ratio = minAgainst(color, backgroundsAt(rect.left + rect.width / 2, rect.top + rect.height / 2));
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const needed = large ? 3 : 4.5;
      texts++;
      lowestText = Math.min(lowestText, ratio);
      if (ratio < needed)
        failures.push({ kind: placeholder ? "placeholder" : "text", ratio, needed, at: label(el) });
    }
    if (el.matches("input:not([type=hidden]), textarea, [role=combobox], [role=checkbox], [role=radio], [role=switch]")) {
      edges++;
      const ratio = edgeContrast(el);
      if (ratio < 3) failures.push({ kind: "edge", ratio, needed: 3, at: label(el) });
    }
  }
  return { texts, edges, lowestText, failures };

  function effectiveOpacity(el) {
    let value = 1;
    for (let node = el; node; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
    return value;
  }

  /** The best of border, fill and solid ring against what surrounds the control. */
  function edgeContrast(el) {
    const style = getComputedStyle(el);
    const outside = outsideBackgrounds(el);
    const candidates = [toRgba(style.backgroundColor)];
    for (const side of ["Top", "Right", "Bottom", "Left"])
      if (parseFloat(style[`border${side}Width`]) >= 1 && style[`border${side}Style`] !== "none")
        candidates.push(toRgba(style[`border${side}Color`]));
    for (const layer of shadowLayers(style.boxShadow))
      if (layer.blur === 0 && layer.spread >= 1) candidates.push(layer.color);
    return Math.max(...candidates.map((c) => minAgainst(c, outside)));
  }

  function outsideBackgrounds(el) {
    const r = el.getBoundingClientRect();
    const points = [
      [r.left - 3, r.top + r.height / 2],
      [r.right + 3, r.top + r.height / 2],
      [r.left + r.width / 2, r.top - 3],
      [r.left + r.width / 2, r.bottom + 3],
    ];
    return points.flatMap(([x, y]) => backgroundsAt(x, y, el));
  }
}

/** Installs the shared helpers on window; call once per page before the audits. */
export function installTools() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();

  function toRgba(css) {
    if (cache.has(css)) return [...cache.get(css)];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const rgba = [r, g, b, a / 255];
    cache.set(css, rgba);
    return [...rgba];
  }

  const over = (top, bottom) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
  };

  function luminance([r, g, b]) {
    const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** Lowest contrast of `color` composited over each candidate background. */
  function minAgainst(color, backgrounds) {
    return Math.min(...backgrounds.map((bg) => contrast(over(color, bg), bg)));
  }

  const colourPattern = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|transparent/gi;

  /**
   * Every colour the pixel at (x, y) could have: the stack of backgrounds under
   * the point, composited from the first opaque one up. A gradient adds one
   * candidate per colour stop, which covers translucent and blurred surfaces.
   */
  function backgroundsAt(x, y, skip) {
    const stack = document.elementsFromPoint(x, y).filter((el) => !skip || !skip.contains(el));
    // Hit-testing skips elements with pointer-events: none, which Radix sets on
    // <body> while a modal is open, so the page canvas is always added last.
    for (const el of [document.body, document.documentElement]) if (!stack.includes(el)) stack.push(el);
    const layers = [];
    for (const el of stack) {
      const style = getComputedStyle(el);
      const stops = (style.backgroundImage.match(/gradient\(.*\)/g) ?? []).flatMap((g) => g.match(colourPattern) ?? []);
      const colour = toRgba(style.backgroundColor);
      if (stops.length) layers.push(stops.map(toRgba));
      if (colour[3] > 0) layers.push([colour]);
      if (colour[3] >= 1 && !stops.length) break;
    }
    let results = [[255, 255, 255, 1]];
    for (const layer of layers.reverse()) results = results.flatMap((bg) => layer.map((c) => over(c, bg)));
    return results.slice(0, 64);
  }

  function shadowLayers(value) {
    if (!value || value === "none") return [];
    return value.split(/,(?![^()]*\))/).map((part) => {
      const color = part.match(colourPattern)?.[0] ?? "currentcolor";
      const lengths = part.replace(colourPattern, "").replace("inset", "").trim().split(/\s+/).map(parseFloat);
      const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
      return { color: toRgba(color), x, y, blur, spread, inset: part.includes("inset") };
    });
  }

  function isHidden(el) {
    const style = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (style.visibility !== "visible" || r.width < 2 || r.height < 2) return true;
    return Boolean(el.closest("[hidden], [aria-hidden=true], .sr-only"));
  }

  function isDisabled(el) {
    return Boolean(el.closest(":disabled, [aria-disabled=true], [data-disabled]"));
  }

  function label(el) {
    const text = (el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().slice(0, 40);
    const slot = el.closest("[data-slot]")?.getAttribute("data-slot");
    return `${el.tagName.toLowerCase()}${slot ? `[${slot}]` : ""} "${text}"`;
  }

  window.__styleCheckTools = {
    toRgba,
    over,
    contrast,
    minAgainst,
    backgroundsAt,
    shadowLayers,
    isHidden,
    isDisabled,
    label,
  };
}

/** Records the unfocused look of every focusable control, keyed by a data attribute. */
export function snapshotFocusables() {
  const { toRgba, shadowLayers } = window.__styleCheckTools;
  const look = (el) => {
    const s = getComputedStyle(el);
    return {
      outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 1 ? toRgba(s.outlineColor) : null,
      shadows: shadowLayers(s.boxShadow).map((l) => l.color.join()),
      borders: ["Top", "Right", "Bottom", "Left"].map((side) => toRgba(s[`border${side}Color`]).join()),
      background: toRgba(s.backgroundColor).join(),
    };
  };
  window.__styleCheckLook = look;
  const all = document.querySelectorAll("a[href], button, input, textarea, select, [tabindex]");
  window.__styleCheckBefore = new Map([...all].map((el) => [el, look(el)]));
}

/** Checks the focused element shows an indicator that reaches 3:1 against its surroundings. */
export function auditFocused() {
  const { toRgba, over, contrast, minAgainst, backgroundsAt, shadowLayers, label } = window.__styleCheckTools;
  const el = document.activeElement;
  if (!el || el === document.body || el.localName === "nextjs-portal") return null;
  const before = window.__styleCheckBefore.get(el);
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const outside = [
    [r.left - 4, r.top + r.height / 2],
    [r.right + 4, r.top + r.height / 2],
  ].flatMap(([x, y]) => backgroundsAt(x, y, el));
  const own = toRgba(s.backgroundColor);
  const indicators = [];
  if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 1)
    indicators.push(["outline", minAgainst(toRgba(s.outlineColor), parseFloat(s.outlineOffset) < 0 ? [own] : outside)]);
  for (const layer of shadowLayers(s.boxShadow))
    if (layer.spread >= 1 && !before?.shadows.includes(layer.color.join()))
      indicators.push(["ring", minAgainst(layer.color, outside)]);
  for (const side of ["Top", "Right", "Bottom", "Left"]) {
    const colour = toRgba(s[`border${side}Color`]);
    if (parseFloat(s[`border${side}Width`]) >= 1 && before && !before.borders.includes(colour.join()))
      indicators.push(["border", minAgainst(colour, outside)]);
  }
  if (before && before.background !== own.join()) {
    const was = before.background.split(",").map(Number);
    indicators.push(["background", Math.min(...outside.map((bg) => contrast(over(own, bg), over(was, bg))))]);
  }
  const best = indicators.reduce((top, item) => (item[1] > top[1] ? item : top), ["none", 0]);
  el.dataset.styleCheckId ||= String(document.querySelectorAll("[data-style-check-id]").length);
  return { at: label(el), indicator: best[0], ratio: best[1], id: el.dataset.styleCheckId };
}
