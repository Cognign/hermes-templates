import { requirePageUser } from "@/lib/server/auth";
import { safeMessage } from "@/lib/http";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function GeneralPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const context = await requirePageUser();
  const messages = await searchParams;
  const error = safeMessage(messages.error || null);
  const success = safeMessage(messages.success || null);

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="mt-6 max-w-2xl">
        <form method="post" action="/api/account/profile" className="contents">
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" defaultValue={context.user.name || ""} required maxLength={100} />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" defaultValue={context.user.email} required maxLength={255} />
              </Field>
              <FormMessage error={error} success={success} />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit">Save changes</Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
