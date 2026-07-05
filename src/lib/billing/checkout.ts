import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getStripe } from "./client";

export type CreateCheckoutSessionInput = {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string }> {
  const stripe = getStripe();
  const { userId, email, priceId, successUrl, cancelUrl } = input;

  let customerRow = await db.query.customers.findFirst({
    where: eq(customers.userId, userId),
  });

  if (!customerRow) {
    const stripeCustomer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    // Concurrent checkouts (double-click, retry) can race to create the row.
    // onConflictDoNothing lets the loser detect the winner instead of throwing
    // on the unique user_id constraint; the loser's Stripe customer is orphaned,
    // so best-effort delete it and use the winner's row.
    const [inserted] = await db
      .insert(customers)
      .values({ userId, stripeCustomerId: stripeCustomer.id })
      .onConflictDoNothing({ target: customers.userId })
      .returning();
    if (inserted) {
      customerRow = inserted;
    } else {
      await stripe.customers.del(stripeCustomer.id).catch(() => {});
      customerRow = await db.query.customers.findFirst({
        where: eq(customers.userId, userId),
      });
      if (!customerRow) {
        throw new Error(`Failed to resolve billing customer for ${userId}`);
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerRow.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    client_reference_id: userId,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session did not return a URL");
  }
  return { url: session.url };
}
