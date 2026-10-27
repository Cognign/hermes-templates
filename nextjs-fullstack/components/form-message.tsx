import { Alert, AlertDescription } from "@/components/ui/alert";

/** The error and success text that routes put in the query string after a form post. */
export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error)
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription className="text-destructive">{error}</AlertDescription>
      </Alert>
    );
  if (success)
    return (
      <Alert role="status">
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  return null;
}
