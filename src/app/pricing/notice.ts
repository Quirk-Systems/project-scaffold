/**
 * What to tell a payer who lands back on /pricing after an off-site Stripe
 * step. Anyone can supply these URL values; they prove nothing about payment
 * or subscription state. Report the return signal without asserting either.
 */
export type CheckoutNotice = { tone: "info" | "success"; message: string };

export function checkoutNotice(
  status: string | string[] | undefined,
): CheckoutNotice | null {
  switch (status) {
    case "success":
      return {
        tone: "info",
        message:
          "You returned from checkout. Payment and subscription status are not confirmed here; activation depends on Stripe's confirmation.",
      };
    case "cancel":
      return {
        tone: "info",
        message:
          "Checkout cancellation requested. Payment status is not confirmed here.",
      };
    case "already-subscribed":
      return {
        tone: "info",
        message:
          "Checkout reported an existing subscription. Subscription status is not confirmed here; check billing before trying again.",
      };
    default:
      return null;
  }
}
