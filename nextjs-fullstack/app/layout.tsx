import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { htmlClass, readTheme } from "@/lib/theme";
import { fontVariables } from "./fonts";
import themeFile from "../hermes-theme.json";

const theme = readTheme(themeFile);

// Hermes previews run `next dev`. A published app is a release build and never gets the live
// theme script.
const livePreview = process.env.NODE_ENV === "development" && process.env.APP_ENV !== "production";

export const metadata: Metadata = {
  title: "Hermes Next.js Starter",
  description: "A secure full-stack Next.js and PostgreSQL starter.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so a `system` theme never flashes the wrong colour scheme. It follows
// the system setting, including a change while the page is open, unless the live preview has
// since set data-mode to `light` or `dark`. A `light` or `dark` theme needs no script.
const systemModeScript = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var o=d.dataset.mode;d.classList.toggle("dark",o==="dark"||(o==="system"&&m.matches))}a();m.addEventListener("change",a)})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={htmlClass(theme.style, theme.mode, fontVariables)}
      data-mode={theme.mode}
      suppressHydrationWarning
    >
      <head>
        {theme.mode === "system" && <script dangerouslySetInnerHTML={{ __html: systemModeScript }} />}
        {livePreview && <script src="/hermes-live-theme.js" data-dark="class" defer />}
        <noscript>
          <style>{`.js-only{display:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
