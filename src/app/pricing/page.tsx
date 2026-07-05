import { env } from "@/lib/env";
import { startCheckout } from "./actions";

// Evaluate STRIPE_PRICE_ID at request time, not build time: builds run
// without secrets (SKIP_ENV_VALIDATION), so static prerendering would bake
// configured=false into deployments that supply the env var at runtime.
export const dynamic = "force-dynamic";

export default function PricingPage() {
  const configured = Boolean(env.STRIPE_PRICE_ID);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      <div className="border-border bg-card w-full max-w-md rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Pro</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          $X / month &mdash; replace with your product copy.
        </p>
        {configured ? (
          <form action={startCheckout} className="mt-6">
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium"
            >
              Subscribe
            </button>
          </form>
        ) : (
          <p className="text-muted-foreground mt-6 text-xs">
            Configure <code>STRIPE_PRICE_ID</code> in <code>.env</code> to
            enable checkout.
          </p>
        )}
      </div>
    </main>
  );
}
