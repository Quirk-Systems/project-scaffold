import { SubscribeButton } from "@/components/billing/SubscribeButton";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { startCheckout } from "./actions";
import { checkoutNotice } from "./notice";

// Evaluate STRIPE_PRICE_ID at request time, not build time: builds run
// without secrets (SKIP_ENV_VALIDATION), so static prerendering would bake
// configured=false into deployments that supply the env var at runtime.
export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const configured = Boolean(env.STRIPE_PRICE_ID);
  // Stripe sends payers back here with ?status=success or ?status=cancel.
  const notice = checkoutNotice((await searchParams).status);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      {notice && (
        <p
          role="status"
          className={cn(
            "w-full max-w-md rounded-md border px-4 py-3 text-sm",
            notice.tone === "success"
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {notice.message}
        </p>
      )}
      <div className="border-border bg-card w-full max-w-md rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Pro</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          $X / month &mdash; replace with your product copy.
        </p>
        {configured ? (
          <form action={startCheckout} className="mt-6">
            <SubscribeButton />
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
