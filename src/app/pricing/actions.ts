"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { createCheckoutSession, AlreadySubscribedError } from "@/lib/billing";

// Prefer the configured public URL; otherwise derive the origin from the
// request so hosted Checkout never redirects a deployed app to localhost.
async function resolveAppUrl(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Cannot resolve app URL for checkout redirects: set NEXT_PUBLIC_APP_URL",
    );
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
      redirect("/pricing?status=already-subscribed");
    }
    throw err;
  }

  redirect(checkoutUrl);
}
