import Link from "next/link";
import { CircleIcon } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldErrorProps } from "@/lib/form-errors";
import { invalidFields } from "@/lib/http";

export function Login({
  mode,
  error,
  fields,
}: {
  mode: "signin" | "signup";
  error?: string;
  fields?: string;
}) {
  const signingIn = mode === "signin";
  const invalid = error ? invalidFields(fields, ["email", "password"]) : new Set<string>();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <CircleIcon className="size-10" aria-hidden="true" />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl font-semibold">
                {signingIn ? "Sign in to your account" : "Create your account"}
              </h1>
            </CardTitle>
          </CardHeader>
          <form method="post" action={signingIn ? "/api/auth/sign-in" : "/api/auth/sign-up"} className="contents">
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="email" required maxLength={255} {...fieldErrorProps(invalid, "email")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={signingIn ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    maxLength={100}
                    {...fieldErrorProps(invalid, "password")}
                  />
                </Field>
                <FormMessage error={error} />
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full">
                {signingIn ? "Sign in" : "Sign up"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="text-sm text-muted-foreground">
          {signingIn ? "Need an account?" : "Already have an account?"}{" "}
          <Link
            href={signingIn ? "/sign-up" : "/sign-in"}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {signingIn ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}
