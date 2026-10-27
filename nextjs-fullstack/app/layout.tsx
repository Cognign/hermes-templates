import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

// Bundled with the @fontsource-variable/inter package, so the build needs no network.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hermes Next.js Starter",
  description: "A secure full-stack Next.js and PostgreSQL starter.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so the page never flashes the wrong colour scheme.
// It follows the system setting, including a change while the page is open.
const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: dark)");function a(){document.documentElement.classList.toggle("dark",m.matches)}a();m.addEventListener("change",a)})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`style-vega ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
