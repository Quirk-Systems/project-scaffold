/**
 * What to tell a payer who lands back on /pricing after an off-site Stripe
 * step. The redirect alone proves nothing about payment, so "success" says
 * activation waits on Stripe's confirmation (the webhook), not that it happened.
 */
export type CheckoutNotice = { tone: "info" | "success"; message: string };

export function checkoutNotice(
  status: string | string[] | undefined,
): CheckoutNotice | null {
  switch (status) {
    case "success":
      return {
        tone: "success",
        message:
          "Checkout complete. Your subscription turns on as soon as Stripe confirms the payment.",
      };
    case "cancel":
      return {
        tone: "info",
        message: "Checkout cancelled. You have not been charged.",
      };
    case "already-subscribed":
      return {
        tone: "info",
        message:
          "You already have a subscription, so there is nothing to buy again.",
      };
    default:
      return null;
  }
}
