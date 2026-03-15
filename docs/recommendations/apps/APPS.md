# Apps, Stacks & SaaS Patterns

---

## The Modern SaaS Stack (2025)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js (App Router) | RSC, streaming, great DX |
| Styling | Tailwind + shadcn/ui | Fast, composable, accessible |
| Backend | Next.js API routes or Hono | Co-located or edge-ready |
| Auth | Auth.js / Clerk | Clerk if you want to ship fast |
| DB | Postgres (Neon / Supabase) | Real SQL, scales fine |
| ORM | Prisma or Drizzle | Prisma for DX, Drizzle for speed |
| Cache | Upstash Redis | Serverless, cheap |
| Queue | Inngest / BullMQ | Inngest for serverless |
| Storage | Cloudflare R2 | S3-compatible, no egress fees |
| Email | Resend + React Email | Best DX for transactional |
| Payments | Stripe | Still the one |
| Analytics | PostHog | Open source, self-hostable |
| Error tracking | Sentry | Standard |
| Deploy | Vercel + Railway | Frontend + backend split |

---

## Starter Kits Worth Using

### Next.js
- [create-t3-app](https://create.t3.gg) — Next + Prisma + tRPC + Auth.js + Tailwind
- [shadcn-ui](https://ui.shadcn.com) — component system
- [Taxonomy](https://github.com/shadcn/taxonomy) — shadcn's own SaaS example
- [Vercel Commerce](https://github.com/vercel/commerce) — e-commerce reference

### Python
- [FastAPI template](https://github.com/fastapi/full-stack-fastapi-template) — official
- [Litestar](https://litestar.dev) — FastAPI alternative, batteries included

### Go
- [golang-standards/project-layout](https://github.com/golang-standards/project-layout) — layout reference
- [chi](https://github.com/go-chi/chi) — lightweight router

---

## App Architecture Patterns

### Feature Flags
```typescript
// Simple env-based flags
const FLAGS = {
  NEW_DASHBOARD: process.env.NEXT_PUBLIC_FLAG_NEW_DASHBOARD === "true",
  AI_CHAT: process.env.NEXT_PUBLIC_FLAG_AI_CHAT === "true",
} as const;

// Usage
if (FLAGS.NEW_DASHBOARD) {
  return <NewDashboard />;
}
```

```typescript
// PostHog feature flags (server-side)
import { PostHog } from "posthog-node";

const client = new PostHog(process.env.POSTHOG_KEY!);

const isEnabled = await client.isFeatureEnabled(
  "new-checkout",
  userId,
  { groups: { company: companyId } }
);
```

---

### Rate Limiting (Upstash)
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

// In API route
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json({ error: "Rate limited" }, { status: 429, headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
    }});
  }
  // ... handler
}
```

---

### Background Jobs (Inngest)
```typescript
import { inngest } from "./inngest-client";

// Define function
export const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/created" },
  async ({ event, step }) => {
    const user = event.data;

    await step.run("send-email", async () => {
      await resend.emails.send({
        from: "hi@example.com",
        to: user.email,
        subject: "Welcome!",
        react: <WelcomeEmail user={user} />,
      });
    });

    await step.sleep("wait-for-onboarding", "3d");

    await step.run("send-followup", async () => {
      // Check if onboarded, send follow-up if not
    });
  }
);

// Trigger
await inngest.send({ name: "user/created", data: { email, id } });
```

---

### Webhook Handler Pattern
```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(sub);
      break;
    }
  }

  return Response.json({ received: true });
}
```

---

### Optimistic Updates (React Query)
```typescript
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previous = queryClient.getQueryData(["todos"]);

    // Optimistically update
    queryClient.setQueryData(["todos"], (old: Todo[]) =>
      old.map((t) => (t.id === newTodo.id ? { ...t, ...newTodo } : t))
    );

    return { previous };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(["todos"], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

---

## SaaS Pricing Patterns

### Free Tier Decision Framework
```
Free tier purpose:
  → Acquisition tool (lead gen) → be generous
  → Trial (time or feature limited) → clear upgrade path
  → Hobbyist tier → low cost, high volume possible

What to limit:
  → Seats (per-user pricing)
  → Usage (API calls, storage, bandwidth)
  → Features (advanced features = paid)
  → Support tier (email → Slack → dedicated)
```

### Metered Billing (Stripe)
```typescript
// Create usage record
await stripe.subscriptionItems.createUsageRecord(
  subscriptionItemId,
  {
    quantity: apiCallCount,
    timestamp: Math.floor(Date.now() / 1000),
    action: "increment",
  }
);
```

---

## Recommended Libraries

### Validation
- **Zod** — TypeScript-first schema validation
- **Valibot** — smaller bundle alternative

### Forms
- **React Hook Form** + Zod — best combo
- **TanStack Form** — newer, fully type-safe

### State
- **Zustand** — simple global state
- **Jotai** — atomic state
- **TanStack Query** — server state

### Auth
- **Auth.js (NextAuth)** — flexible, open source
- **Clerk** — fully managed, great DX
- **Lucia** — lightweight, full control

### UI
- **shadcn/ui** — copy-paste components
- **Radix UI** — headless primitives
- **Framer Motion** — animations

### Dates
- **date-fns** — tree-shakeable functions
- **Temporal API** — native JS (use polyfill)

### Testing
- **Vitest** — fast, Jest-compatible
- **Playwright** — E2E browser testing
- **MSW** — mock service worker for API mocking
