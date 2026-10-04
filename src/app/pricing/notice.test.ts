import { describe, expect, it } from "vitest";
import { checkoutNotice } from "./notice";

describe("checkoutNotice", () => {
  it("does not claim the subscription is active on success", () => {
    const notice = checkoutNotice("success");
    expect(notice?.tone).toBe("success");
    expect(notice?.message).toMatch(/as soon as Stripe confirms/);
  });

  it("tells a cancelled payer they were not charged", () => {
    expect(checkoutNotice("cancel")?.message).toMatch(/not been charged/);
  });

  it("explains the already-subscribed fallback", () => {
    expect(checkoutNotice("already-subscribed")?.message).toMatch(
      /already have a subscription/,
    );
  });

  it("ignores a missing, unknown, or repeated status", () => {
    expect(checkoutNotice(undefined)).toBeNull();
    expect(checkoutNotice("paid")).toBeNull();
    expect(checkoutNotice(["success", "cancel"])).toBeNull();
  });
});
