import { Login } from "../login";
import { safeMessage } from "@/lib/http";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fields?: string }>;
}) {
  const { error, fields } = await searchParams;
  return <Login mode="signin" error={safeMessage(error || null)} fields={fields} />;
}
