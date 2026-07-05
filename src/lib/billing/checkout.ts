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
    const [inserted] = await db
      .insert(customers)
      .values({ userId, stripeCustomerId: stripeCustomer.id })
      .returning();
    customerRow = inserted;
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
