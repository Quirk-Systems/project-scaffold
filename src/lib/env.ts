import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().optional(),
    AUTH_SECRET: z.string().min(1).optional(),
    // Resend accepts both "user@example.com" and "Name <user@example.com>".
    AUTH_EMAIL_FROM: z
      .string()
      .refine(
        (v) =>
          /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v) ||
          /^.+<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/.test(v),
        "must be an email address or 'Display Name <email>'",
      )
      .optional(),
    RESEND_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

const REQUIRED_IN_PROD = ["AUTH_SECRET", "DATABASE_URL"] as const;

export function requireProductionEnv(): void {
  if (process.env.SKIP_ENV_VALIDATION) return;
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
