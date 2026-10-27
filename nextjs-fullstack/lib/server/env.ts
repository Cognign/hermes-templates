import "server-only";

import {
  databaseConfigFrom,
  sessionCookieSecureFrom,
  validateRuntimeEnvFrom,
} from "@/lib/env-core";

export function databaseConfig() {
  return databaseConfigFrom(process.env);
}

export function sessionCookieSecure() {
  return sessionCookieSecureFrom(process.env);
}

export function validateRuntimeEnv() {
  validateRuntimeEnvFrom(process.env);
}
