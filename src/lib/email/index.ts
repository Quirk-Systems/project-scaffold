import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { env } from "@/lib/env";
import { getResend } from "./client";

export { getResend, assertEmailConfigured } from "./client";

type Content =
  | { react: ReactElement; html?: never }
  | { html: string; react?: never };

export type SendEmailInput = Content & {
  to: string | string[];
  subject: string;
  text?: string;
  from?: string;
};

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ id: string }> {
  const resend = getResend();
  const from = input.from ?? env.AUTH_EMAIL_FROM!;

  const html = input.react ? await render(input.react) : input.html;
  const text =
    input.text ??
    (input.react ? await render(input.react, { plainText: true }) : undefined);

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
  if (!data) {
    throw new Error("Resend returned no data");
  }
  return { id: data.id };
}
