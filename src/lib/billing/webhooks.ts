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
      await syncSubscriptionFromStripe(database, session.subscription);
      return;
    }
    // Stripe does not guarantee event ordering, so never apply the event's
    // snapshot directly — a delayed pre-cancellation update could reinsert a
    // row after deletion, or a stale `created` could overwrite newer state.
    // Instead, re-fetch the subscription and sync from Stripe's current truth.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      await syncSubscriptionFromStripe(database, event.data.object.id);
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
      // Accounts pinned to API versions >= 2025-03-31 (basil) send the
      // subscription under invoice.parent; older account versions still send
      // a top-level invoice.subscription. The client doesn't pin apiVersion,
      // so webhook payloads follow the account version — read both shapes.
      const subRef =
        invoice.parent?.subscription_details?.subscription ??
        (invoice as unknown as { subscription?: string | { id: string } })
          .subscription;
      const subId = typeof subRef === "string" ? subRef : (subRef?.id ?? null);
      if (!subId) return;
      // Don't hardcode past_due: a failed *first* invoice leaves the
      // subscription `incomplete`, not delinquent. Sync the actual status so
      // an unpaid signup never looks like an existing subscriber in grace.
      await syncSubscriptionFromStripe(database, subId);
      return;
    }
    default: {
      console.warn(`[stripe] unhandled event type: ${event.type}`);
      return;
    }
  }
}

// Fetches the subscription's current state from Stripe and mirrors it
// locally: canceled subscriptions are removed, everything else is upserted.
async function syncSubscriptionFromStripe(
  database: Database,
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  if (sub.status === "canceled") {
    await database
      .delete(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));
    return;
  }
  await upsertSubscription(database, sub);
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

  // Basil (2025-03-31) moved current_period_end onto subscription items;
  // pre-basil account versions still send it at the subscription level.
  const periodEnd =
    primaryItem.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  const values = {
    userId: customerRow.userId,
    customerId: customerRow.id,
    stripeSubscriptionId: sub.id,
    stripePriceId: primaryItem.price.id,
    status: sub.status,
    currentPeriodEnd:
      typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null,
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
