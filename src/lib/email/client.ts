import { Resend } from "resend";
import { env } from "@/lib/env";
import { createLazyClient } from "@/lib/lazy-client";

const client = createLazyClient({
  name: "Email",
  requires: {
    RESEND_API_KEY: env.RESEND_API_KEY,
    AUTH_EMAIL_FROM: env.AUTH_EMAIL_FROM,
  },
  create: () => new Resend(env.RESEND_API_KEY!),
});

export const getResend = client.get;
export const assertEmailConfigured = client.assertConfigured;
