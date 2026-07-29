---
paths:
  - "src/lib/**"
  - "src/emails/**"
  - "src/app/api/**"
  - "src/app/pricing/**"
  - "src/instrumentation.ts"
  - "src/components/posthog-provider.tsx"
---

# Integrations

### Third-party clients (shared pattern)

- `src/lib/lazy-client.ts` — `createLazyClient({ name, requires, create })` memoizes the client, defers construction until first use (so the scaffold builds without secrets), and `assertConfigured()` throws an aggregated `"<name> not configured: set X, Y"` when required env vars are missing
- Billing, Email, and AI clients are thin wrappers over it — add new integrations the same way

### Media storage (Supabase Storage)

- Module: `src/lib/quirk/media.ts` — lazy `getMediaStorage()` via `createLazyClient` (requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), `uploadMedia()`, `getMediaUrl()` (1h signed URLs), `assetTypeForContentType()`
- Bucket: private `quirk-assets`, auto-created on first upload; paths are `media/<uuid>/<sanitized-filename>`
- Routes: `POST /api/assets/upload` (multipart `file` + optional `title`/`metadata` JSON → bucket + Archivist capture), `GET /api/assets/[id]/media` (302 to signed URL)
- **Visibility is a curation decision**: asset `status` gates publication in the app layer; the bucket stays private and nothing links directly into it
- Architecture detail (storage topology, lifecycle, monorepo graduation plan): `docs/ARCHITECTURE.md`

### Billing (Stripe)

- Module: `src/lib/billing/` — `client.ts` (lazy `getStripe()`), `checkout.ts` (`createCheckoutSession`), `webhooks.ts` (`handleStripeEvent`), `index.ts` (barrel)
- Webhook route: `src/app/api/webhooks/stripe/route.ts` (nodejs runtime, force-dynamic, raw body via `req.text()`)
- Customer-facing route: `src/app/pricing/` — Server Component + Server Action (`startCheckout`, uses `auth()`)
- Tables: `customers` (1:1 with `users`), `subscriptions` (keyed on `stripeSubscriptionId`, status typed via `Stripe.Subscription.Status`)
- Local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, copy the `whsec_…` into `.env`, checkout with `4242 4242 4242 4242`

### Email (Resend + react-email)

- Module: `src/lib/email/` — `sendEmail()` accepts either `react` (rendered to HTML + plaintext) or raw `html` (discriminated union — pass exactly one)
- Templates in `src/emails/` (`magic-link.tsx`, `welcome.tsx`, shared layout); `bun run email:dev` previews them on port 3001
- All outgoing mail goes through `sendEmail()` so providers can be swapped in one file

### AI (Claude persona/register layer)

- Module: `src/lib/ai/` — lazy `getAnthropic()` (`DEFAULT_MODEL` `claude-opus-4-7`), `personas.ts` (frozen cacheable house voice), `registers.ts` (tonal modes with animation vocabularies), `compose.ts` (cache breakpoint on the persona prefix), `generate.ts` (`generateText`/`streamText`/`createStream`), `animation.ts` (`AiState` lifecycle)
- **No `temperature`/`top_p`/`top_k`** — removed on Opus 4.7 (they 400); tune via prompt + `effort`
- Defaults tuned for snappy tone responses: `effort: "low"`, thinking off, `max_tokens: 1024`

### Analytics & flags (PostHog)

- `src/lib/analytics.ts` (server `capture()`/`isFeatureEnabled()`) and `src/components/posthog-provider.tsx` (client, wired into `Providers`) — both **no-op when `NEXT_PUBLIC_POSTHOG_KEY` is unset**; client code reads public values from `useRuntimeConfig()` so promoted images use the runtime environment instead of build-time-inlined values
- `src/lib/flags.ts` — `flag(name, { distinctId, default })` resolves `FLAG_<UPPER_SNAKE>` env override → PostHog → default
- `src/instrumentation.ts` — Next `register()` + `onRequestError` (routed through the pino logger); the documented hook for Sentry/OTel
