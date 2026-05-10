import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().optional(),
    AUTH_SECRET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

const REQUIRED_IN_PROD = ["AUTH_SECRET", "DATABASE_URL"] as const;

export function requireProductionEnv(): void {
  if (env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PROD.filter(
    (key) => !env[key as keyof typeof env],
  );
  if (missing.length > 0) {
    throw new Error(
      `Production build requires: ${missing.join(", ")}. ` +
        `Set them in .env or the deployment environment.`,
    );
  }
}
