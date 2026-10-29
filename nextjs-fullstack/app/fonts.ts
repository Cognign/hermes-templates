import localFont from "next/font/local";

// Every font a theme can pick, bundled so the build needs no network. Inter comes from its package;
// the others are files in fonts/, so the package lock stays the one Hermes approves for every app
// version. Each one only defines --font-<id>; theme.css decides which are used, and a browser
// downloads a font only when the page uses it. None is preloaded: next/font needs a fixed
// `preload` value here, and preloading all of them would download the unused ones too.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
const geist = localFont({
  src: "../fonts/geist/geist-latin-wght-normal.woff2",
  variable: "--font-geist",
  display: "swap",
  preload: false,
});
const dmSans = localFont({
  src: "../fonts/dm-sans/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});
const spaceGrotesk = localFont({
  src: "../fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});
const montserrat = localFont({
  src: "../fonts/montserrat/montserrat-latin-wght-normal.woff2",
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});
const lora = localFont({
  src: "../fonts/lora/lora-latin-wght-normal.woff2",
  variable: "--font-lora",
  display: "swap",
  preload: false,
});
const playfairDisplay = localFont({
  src: "../fonts/playfair-display/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair-display",
  display: "swap",
  preload: false,
});
const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});
const geistMono = localFont({
  src: "../fonts/geist-mono/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  inter,
  geist,
  dmSans,
  spaceGrotesk,
  montserrat,
  lora,
  playfairDisplay,
  jetbrainsMono,
  geistMono,
]
  .map((font) => font.variable)
  .join(" ");
