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
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="font-semibold">Dashboard</Link>
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline">{context.user.email}</span>
            <form method="post" action="/api/auth/sign-out">
              <Button variant="outline" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[15rem_1fr]">
        <DashboardNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
