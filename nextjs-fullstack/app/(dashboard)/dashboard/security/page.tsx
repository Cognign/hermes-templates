import { safeMessage } from "@/lib/http";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const passwordFields = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
] as const;

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const messages = await searchParams;
  const error = safeMessage(messages.error || null);
  const success = safeMessage(messages.success || null);

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Security</h1>
      <Card className="mt-6 max-w-2xl">
        <form method="post" action="/api/account/password" className="contents">
          <CardContent>
            <FieldGroup>
              {passwordFields.map(({ name, label, autoComplete }) => (
                <Field key={name}>
                  <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  <Input id={name} name={name} type="password" autoComplete={autoComplete} required minLength={8} maxLength={100} />
                </Field>
              ))}
              <FormMessage error={error} success={success} />
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit">Change password</Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
