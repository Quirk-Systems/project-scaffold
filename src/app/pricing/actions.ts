"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { createCheckoutSession } from "@/lib/billing";

export async function startCheckout(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/api/auth/signin");
  }
  if (!env.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkout = await createCheckoutSession({
    userId: session.user.id,
    email: session.user.email,
    priceId: env.STRIPE_PRICE_ID,
    successUrl: `${appUrl}/pricing?status=success`,
    cancelUrl: `${appUrl}/pricing?status=cancel`,
  });

  redirect(checkout.url);
}
