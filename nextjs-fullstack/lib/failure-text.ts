/**
 * Text that is safe to print for a startup failure. Drizzle wraps a failed
 * query in an error whose message holds the SQL parameters (the session key
 * on first start), so this prints the innermost cause, never the wrapper.
 * The database URL is removed from whatever is left.
 */
export function failureText(error: unknown, env: Record<string, string | undefined>) {
  let inner: unknown = error;
  while (inner instanceof Error && inner.cause !== undefined) inner = inner.cause;
  const message = inner instanceof Error ? inner.message : "Unknown error";
  const code = (inner as { code?: unknown } | null)?.code;
  let text = typeof code === "string" && !message.includes(code) ? `${code} ${message}` : message;
  const url = env.DATABASE_URL?.trim();
  if (url) {
    for (const secret of [url, safePassword(url)]) {
      if (secret) text = text.split(secret).join("[redacted]");
    }
  }
  return text.split("\n")[0] ?? text;
}

function safePassword(url: string) {
  try {
    return new URL(url).password || undefined;
  } catch {
    return undefined;
  }
}
