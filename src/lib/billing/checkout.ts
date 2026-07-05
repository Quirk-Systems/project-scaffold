import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, subscriptions } from "@/lib/db/schema";
import { getStripe } from "./client";

export class AlreadySubscribedError extends Error {
  constructor(userId: string) {
    super(`User ${userId} already has an active subscription`);
    this.name = "AlreadySubscribedError";
  }
}

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

  // Stripe happily creates multiple subscriptions for one customer, which
  // double-bills a user who revisits /pricing after subscribing. Short-circuit
  // on every non-terminal status — including unpaid (failed-payment setting)
  // and paused — and route those users to billing management instead.
  // `incomplete` is deliberately NOT blocked: it marks an abandoned first
  // payment, and the idempotency key below already dedupes rapid retries.
  const existing = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      inArray(subscriptions.status, [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "paused",
      ]),
    ),
  });
  if (existing) {
    throw new AlreadySubscribedError(userId);
  }

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

  // The local-subscription guard above can't catch a double-click/retry that
  // lands before the webhook writes the subscriptions row. A time-bucketed
  // idempotency key makes rapid duplicate attempts return the SAME Checkout
  // Session instead of minting a second billable one; the 10-minute bucket
  // lets a genuinely new attempt (e.g. after abandoning) proceed later.
  const idempotencyBucket = Math.floor(Date.now() / 600_000);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerRow.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: userId,
    },
    {
      idempotencyKey: `checkout:${userId}:${priceId}:${idempotencyBucket}`,
    },
  );

  if (!session.url) {
    throw new Error("Stripe Checkout session did not return a URL");
  }
  return { url: session.url };
}
