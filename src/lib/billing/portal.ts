import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getStripe } from "./client";

// Stripe's hosted Billing Portal is the recovery path for existing
// subscribers: update payment method (past_due), cancel, or switch plans.
// Requires the portal to be configured once in the Stripe dashboard
// (test mode ships a default configuration).
export async function createBillingPortalSession(input: {
  userId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const customerRow = await db.query.customers.findFirst({
    where: eq(customers.userId, input.userId),
  });
  if (!customerRow) {
    throw new Error(`No billing customer for user ${input.userId}`);
  }
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerRow.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return { url: portal.url };
}
