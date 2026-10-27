import Link from "next/link";
import { CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <CircleIcon className="size-12" aria-hidden="true" />
        <h1 className="text-4xl font-bold tracking-tight">Page Not Found</h1>
        <p className="text-base text-muted-foreground">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </main>
  );
}
