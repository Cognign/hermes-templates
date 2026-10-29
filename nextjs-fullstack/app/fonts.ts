import localFont from "next/font/local";

// Every font a theme can pick, from the bundled @fontsource-variable packages, so the build needs
// no network. Each one only defines --font-<id>; theme.css decides which are used, and a browser
// downloads a font only when the page uses it. None is preloaded: next/font needs a fixed
// `preload` value here, and preloading all of them would download the unused ones too.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
const geist = localFont({
  src: "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist",
  display: "swap",
  preload: false,
});
const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});
const spaceGrotesk = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});
const montserrat = localFont({
  src: "../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});
const lora = localFont({
  src: "../node_modules/@fontsource-variable/lora/files/lora-latin-wght-normal.woff2",
  variable: "--font-lora",
  display: "swap",
  preload: false,
});
const playfairDisplay = localFont({
  src: "../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair-display",
  display: "swap",
  preload: false,
});
const jetbrainsMono = localFont({
  src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});
const geistMono = localFont({
  src: "../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
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
