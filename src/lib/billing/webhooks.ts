import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, subscriptions } from "@/lib/db/schema";
import { getStripe } from "./client";

type Database = typeof db;

export async function handleStripeEvent(
  event: Stripe.Event,
  database: Database = db,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (!session.subscription || typeof session.subscription !== "string") {
        return;
      }
      const sub = await getStripe().subscriptions.retrieve(
        session.subscription,
      );
      await upsertSubscription(database, sub);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await upsertSubscription(database, event.data.object);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await database
        .delete(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subId = typeof subRef === "string" ? subRef : (subRef?.id ?? null);
      if (!subId) return;
      await database
        .update(subscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subId));
      return;
    }
    default: {
      console.warn(`[stripe] unhandled event type: ${event.type}`);
      return;
    }
  }
}

async function upsertSubscription(
  database: Database,
  sub: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const customerRow = await database.query.customers.findFirst({
    where: eq(customers.stripeCustomerId, stripeCustomerId),
  });
  if (!customerRow) {
    console.warn(
      `[stripe] received subscription ${sub.id} for unknown customer ${stripeCustomerId}`,
    );
    return;
  }

  const primaryItem = sub.items.data[0];
  if (!primaryItem) {
    console.warn(`[stripe] subscription ${sub.id} has no items`);
    return;
  }

  const values = {
    userId: customerRow.userId,
    customerId: customerRow.id,
    stripeSubscriptionId: sub.id,
    stripePriceId: primaryItem.price.id,
    status: sub.status,
    currentPeriodEnd: new Date(primaryItem.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  } as const;

  await database
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status: values.status,
        stripePriceId: values.stripePriceId,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: values.updatedAt,
      },
    });
}
