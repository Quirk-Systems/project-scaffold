import Stripe from "stripe";
import { env } from "@/lib/env";
import { createLazyClient } from "@/lib/lazy-client";

// Pin apiVersion in the constructor (e.g. apiVersion: "2026-04-22.dahlia") if a
// project needs a specific account-level version; the SDK default is used here.
const client = createLazyClient({
  name: "Stripe",
  requires: { STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY },
  create: () => new Stripe(env.STRIPE_SECRET_KEY!, { typescript: true }),
});

export const getStripe = client.get;
export const assertStripeConfigured = client.assertConfigured;
