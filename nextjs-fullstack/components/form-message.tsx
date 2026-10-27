"use client";

import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FORM_ERROR_ID } from "@/lib/form-errors";

/**
 * The error and success text that routes put in the query string after a form
 * post. The page has just reloaded, so an error takes focus: a screen reader
 * announces it and the next Tab starts at the form.
 */
export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (error)
    return (
      <Alert ref={errorRef} id={FORM_ERROR_ID} tabIndex={-1} variant="destructive" role="alert" className="wrap-anywhere">
        <AlertDescription className="text-destructive">{error}</AlertDescription>
      </Alert>
    );
  if (success)
    return (
      <Alert role="status" className="wrap-anywhere">
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  return null;
}
