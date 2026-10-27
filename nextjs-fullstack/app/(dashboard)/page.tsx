import Link from "next/link";
import { Activity, CircleIcon, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: ShieldCheck,
    title: "Application accounts",
    text: "Email and password sign-in with signed, HTTP-only sessions and server-side authorization.",
  },
  {
    icon: Database,
    title: "Real persistence",
    text: "PostgreSQL, Drizzle schema, and committed migrations replace mock data from the start.",
  },
  {
    icon: Activity,
    title: "Account workflow",
    text: "A protected dashboard includes profile, password, team, and activity views.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <CircleIcon className="size-6" aria-hidden="true" />
            Starter
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Next.js full-stack starter
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Start with a working product foundation.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Build the requested workflow on top of a responsive application with authentication,
              PostgreSQL persistence, and secure server boundaries already in place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">Create an account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {features.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 size-6" aria-hidden="true" />
                  <CardTitle>
                    <h2 className="text-lg font-semibold">{title}</h2>
                  </CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
