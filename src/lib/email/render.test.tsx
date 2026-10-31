// @vitest-environment node
import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { render as renderFromComponents } from "@react-email/components";
import { MagicLinkEmail } from "@/emails/magic-link";
import { WelcomeEmail } from "@/emails/welcome";

describe("email renderer security upgrade", () => {
  it.each([render, renderFromComponents])(
    "preserves sign-in URLs in HTML and plain text through both public entry points",
    async (renderEmail) => {
      const url =
        "https://example.com/api/auth/callback/resend?token=test&email=a%40example.com";
      const email = <MagicLinkEmail url={url} />;
      const html = await renderEmail(email);
      const text = await renderEmail(email, { plainText: true });
      expect(html).toContain("Sign in");
      expect(html).toContain(url.replaceAll("&", "&amp;"));
      expect(text).toContain(url);
      expect(text).toContain("This link expires in 24 hours.");
      expect(text).not.toContain("<html");
    },
  );

  it("escapes an untrusted welcome name while preserving readable plain text", async () => {
    const email = (
      <WelcomeEmail
        name={'<script>alert("x")</script>'}
        appUrl="https://example.com/start"
      />
    );
    const html = await render(email);
    const text = await render(email, { plainText: true });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(text).toContain("WELCOME");
    expect(text).toContain("https://example.com/start");
  });
});
