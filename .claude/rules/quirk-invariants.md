---
paths:
  - "src/lib/quirk/**"
  - "src/lib/db/**"
  - "drizzle/**"
  - "src/app/api/offers/**"
  - "src/app/api/runs/**"
---

# Quirk OS invariants

These are correctness properties, not style preferences. Code that violates one
is wrong even when it type-checks and the tests pass.

## A one-of-one is decided by the database, never by the application

`claimOffer()` and `retireOffer()` are single conditional statements —
`UPDATE … WHERE status = 'open' … RETURNING` — and the row that comes back is
the proof the caller won. A `null` return means someone else won, which is a
409, not an error.

Do not replace this with read-then-write. A `getOffer()` check followed by an
update reintroduces the race the conditional update exists to close: two
claimants can both read `open` and both write. `getOffer()` may be used to
choose the error _message_, never to decide whether the mutation is allowed.

## An asset can be minted exactly once, ever

`quirk_offers.asset_id` carries a unique constraint. `mintOffer()` relies on it
via `onConflictDoNothing`, and surfaces a second attempt as
`OfferAlreadyMintedError` → 409. The constraint is the enforcement; the error
type is only the reporting. Do not drop it in a migration.

## Goldilocks gates automatic minting, not human minting

`readGoldilocks()` is pure and deterministic: the same score profile always
produces the same verdict. It gates the auto-mint inside `promoteRun()`
(`src/lib/quirk/experiments.ts`) only. `POST /api/offers` deliberately bypasses
it — heuristics drive, humans overrule.

Promotion must not fail because minting failed. Minting is best-effort inside
promote, and the reading (verdict, heat, reasons) is returned in the response so
the decision is auditable rather than silent.

## Scores are persisted, so their arithmetic is a migration concern

Changing a weight, a rounding precision, or a threshold in `scoring.ts` changes
values already written to `quirk_annotations` and shifts which assets clear the
Goldilocks band. Treat it as a data change with a plan, not a tuning tweak.

## Authenticated mutations fail closed

Claim and retire are auth-gated through `auth()`. Check `session?.user?.id`,
not the truthiness of the session wrapper: Auth.js has shipped an advisory in
exactly that shape, where a configuration error populated the session object
and existence-based checks passed anyway.

What is enforced today is that a _missing_ session is a 401 and never falls
through to the mutation. A session that _throws_ is not: `await auth()` sits
outside the `try` in both routes, so a provider or configuration failure
surfaces as a 500 from Next rather than a 401. That is a gap in the response
contract, not a property to rely on — if you move that call inside the `try`,
map the failure deliberately rather than letting it land in `serverError`.
