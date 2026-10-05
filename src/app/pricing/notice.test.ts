import { describe, expect, it } from "vitest";
import { checkoutNotice } from "./notice";

describe("checkoutNotice", () => {
  it("does not treat a supplied success URL as payment confirmation", () => {
    const notice = checkoutNotice("success");
    expect(notice?.tone).toBe("info");
    expect(notice?.message).toMatch(/not confirmed here/);
    expect(notice?.message).toMatch(/Stripe's confirmation/);
    expect(notice?.message).not.toMatch(/checkout complete/i);
  });

  it("does not treat a supplied cancel URL as proof of no charge", () => {
    expect(checkoutNotice("cancel")?.message).toMatch(/not confirmed here/);
    expect(checkoutNotice("cancel")?.message).not.toMatch(/not been charged/);
  });

  it("explains the already-subscribed fallback", () => {
    expect(checkoutNotice("already-subscribed")?.message).toMatch(
      /not confirmed here/,
    );
    expect(checkoutNotice("already-subscribed")?.message).not.toMatch(
      /already have a subscription/,
    );
  });

  it("ignores a missing, unknown, or repeated status", () => {
    expect(checkoutNotice(undefined)).toBeNull();
    expect(checkoutNotice("paid")).toBeNull();
    expect(checkoutNotice(["success", "cancel"])).toBeNull();
  });
});
