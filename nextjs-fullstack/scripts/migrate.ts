import { runMigrations } from "@/lib/db/migrate";
import { failureText } from "@/lib/failure-text";

runMigrations().catch((error: unknown) => {
  console.error(`Database migration failed: ${failureText(error, process.env)}`);
  process.exitCode = 1;
});
