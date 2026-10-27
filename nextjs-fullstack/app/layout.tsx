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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-gray-50 text-gray-950">{children}</body>
    </html>
  );
}
