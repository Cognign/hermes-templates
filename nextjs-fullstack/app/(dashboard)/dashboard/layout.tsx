import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requirePageUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="font-semibold">Dashboard</Link>
          <p className="order-last min-w-0 basis-full text-sm wrap-anywhere sm:order-none sm:flex-1 sm:basis-0 sm:text-right">
            <span className="sr-only">Signed in as </span>
            {context.user.email}
          </p>
          <form method="post" action="/api/auth/sign-out">
            <Button variant="outline" type="submit" className="text-foreground">Sign out</Button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 lg:grid lg:grid-cols-[15rem_1fr]">
        <DashboardNav />
        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
      </div>
    </div>
  );
}
