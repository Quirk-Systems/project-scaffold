"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  createCheckoutSession,
  createBillingPortalSession,
  AlreadySubscribedError,
} from "@/lib/billing";

// Resolve the base URL for Stripe's success/cancel redirects. In production
// the canonical NEXT_PUBLIC_APP_URL is REQUIRED: Host/x-forwarded-host are
// request-controlled, and deriving redirect URLs from them would let a
// spoofed header send payers to a hostile domain after payment. Header
// derivation is a dev/preview convenience only.
async function resolveAppUrl(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Set NEXT_PUBLIC_APP_URL: checkout redirect URLs must not be derived " +
        "from request headers in production (host-header spoofing risk)",
    );
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    // Local dev has no x-forwarded-proto and doesn't serve TLS — default
    // loopback hosts to http so Stripe doesn't redirect to https://localhost.
    const isLoopback =
      host.startsWith("localhost") ||
      host.startsWith("127.") ||
      host.startsWith("[::1]");
    const proto = h.get("x-forwarded-proto") ?? (isLoopback ? "http" : "https");
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export async function startCheckout(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/api/auth/signin");
  }
  if (!env.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }

  const appUrl = await resolveAppUrl();
  let checkoutUrl: string;
  try {
    const checkout = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId: env.STRIPE_PRICE_ID,
      successUrl: `${appUrl}/pricing?status=success`,
      cancelUrl: `${appUrl}/pricing?status=cancel`,
    });
    checkoutUrl = checkout.url;
  } catch (err) {
    if (err instanceof AlreadySubscribedError) {
      // Existing subscribers (including past_due) go to the Billing Portal to
      // manage or fix payment; fall back to a status flag if the portal
      // isn't configured in the Stripe dashboard yet.
      const portal = await createBillingPortalSession({
        userId: session.user.id,
        returnUrl: `${appUrl}/pricing`,
      }).catch(() => null);
      redirect(portal?.url ?? "/pricing?status=already-subscribed");
    }
    throw err;
  }

  redirect(checkoutUrl);
}
