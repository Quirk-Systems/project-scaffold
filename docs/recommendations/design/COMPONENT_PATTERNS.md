# Component and Journey Patterns

> How the strongest teams build UI that makes money: they own their primitives,
> rent behaviour from headless libraries, compose instead of configure, and
> design every revenue path as an explicit set of states. This file states each
> pattern, shows where this scaffold already follows it, and lists where it
> doesn't yet.

Observed on 2026-10-04 against `project-scaffold` `main` at `2fae638` plus the
design-token commit `ce9e669`. File references are to that tree.

---

## The stack, layer by layer

Each layer depends only on the one above it. Skipping a layer is how a codebase
ends up with forty slightly different buttons.

| Layer      | Lives in                                  | Owns                                   | Never owns                |
| ---------- | ----------------------------------------- | -------------------------------------- | ------------------------- |
| Tokens     | `src/styles/quirk-tokens.css` (generated) | Raw design decisions (`--quirk-*`)     | Component structure       |
| Theme      | `src/app/globals.css` (`@theme inline`)   | Semantic roles (`--primary`, `--card`) | Literal hex values        |
| Primitives | `src/components/ui/` (shadcn, copied in)  | Behaviour, accessibility, variants     | Product copy or data      |
| Composites | `src/components/quirk/`                   | Product meaning built from primitives  | Fetching rules for others |
| Journeys   | `src/app/**` routes and server actions    | Order of steps, every outcome state    | Visual styling            |

The theme does not read the `--quirk-*` tokens yet. Mapping them is a visual
decision owned by `Quirk-Systems/quirk-design`; when it lands, it is one edit to
`@theme inline`, and no component changes.

---

## Patterns

### 1. Own the source

shadcn/ui is copied into the repository, not installed. The code is yours to
read, diff, and change, and an upstream release cannot break you overnight.

- **Do:** add primitives with `bunx shadcn@latest add <name>`, then commit and review the generated file like any other code.
- **Do:** treat an upstream shadcn change as a diff to apply deliberately.
- **Don't:** wrap a primitive in a second "base" component to restyle it. Edit the primitive.

### 2. Rent behaviour, keep the look

Focus management, keyboard support, ARIA roles, and portals are hard to get
right and easy to get subtly wrong. Headless libraries (Radix here) supply that
behaviour with no styling; you supply the styling.

- **In the scaffold:** `Button` renders Radix `Slot` when `asChild` is set (`src/components/ui/button.tsx`), so a link can look like a button without losing link semantics.
- **Do:** reach for a Radix-backed shadcn primitive (Dialog, Tabs, ToggleGroup, DropdownMenu, Popover) before writing a `div` with click handlers.
- **Don't:** hand-roll a modal, tab strip, or menu. The keyboard and screen-reader cases are where hand-rolled versions fail.

### 3. Variants, not boolean props

`cva` turns visual options into a closed, typed set.

- **In the scaffold:** `buttonVariants` and `badgeVariants` define `variant` and `size` (`button.tsx`, `badge.tsx`).
- **Do:** add a variant when a new look recurs at least twice.
- **Don't:** add `isPrimary`, `isLarge`, `isDanger` booleans. They multiply into states nobody designed.

### 4. Compound components with named slots

Split a component into parts the caller arranges: `Card`, `CardHeader`,
`CardTitle`, `CardContent`, `CardFooter`. Mark each part with `data-slot` so
parents can style children without class-name coupling.

- **In the scaffold:** `Card` has the parts (`card.tsx`). `Button` carries `data-slot="button"`; `Card`, `Input`, `Label`, `Separator`, and `Textarea` still use the older `forwardRef` form without `data-slot`.
- **Do:** bring the older primitives to the function-component and `data-slot` form when you next touch them, one primitive per change.

### 5. Compose, don't configure

A component that takes `title`, `subtitle`, `icon`, `footerText`, `onFooterClick`
and a dozen more props has stopped being reusable. Accept `children` and parts
instead.

- **In the scaffold:** `OfferCard` (`src/components/quirk/OffersBoard.tsx`) is assembled from `Card`, `Badge`, and `Button` parts rather than a configured mega-component. That is the right shape.
- **Rule of thumb:** past five props, ask whether the caller should be composing parts instead.

### 6. Server first, client islands

Render on the server by default; add `"use client"` only where the user
interacts.

- **In the scaffold:** the pricing page is a Server Component whose form posts to a server action (`src/app/pricing/page.tsx`, `actions.ts`), so checkout works without client JavaScript. `OffersBoard` is a client island because it filters and mutates.
- **Do:** keep money-moving logic (checkout, claims) in server actions or route handlers. The client only reports outcomes.

### 7. A journey is a set of states, written down

Every flow that ends in a payment, a claim, or a commitment has more outcomes
than "worked" and "failed". Name them all before building the UI.

| State    | What the user sees                                                |
| -------- | ----------------------------------------------------------------- |
| Idle     | The offer and one clear action                                    |
| Pending  | The action disabled, with its in-progress label                   |
| Success  | Confirmation in the place they acted                              |
| Conflict | A legitimate "someone else got there" outcome, not red error text |
| Error    | What broke and what to try, in plain words                        |
| Empty    | Why there is nothing here and how to get something                |
| Return   | What happened after an off-site step (Stripe)                     |

### 8. Real scarcity, told straight

Profit that lasts comes from value people trust, not from pressure. Scarcity is
honest when the system enforces it and the copy says exactly what is true.

- **In the scaffold:** one-of-one offers are enforced by a unique constraint and a single conditional `UPDATE … WHERE status='open'`. "Claim it — only one exists" is literally true.
- **Do:** state the real constraint ("only one exists", "price rises on 1 November") and let it carry the urgency.
- **Don't:** fake countdown timers, invented "3 people are viewing this", pre-ticked add-ons, or a cancel path harder than the sign-up path. They raise one conversion and lower every later one, and several are unlawful in some markets.

### 9. Accessibility is part of the component contract

A primitive is not done until it works with a keyboard and a screen reader.

- **In the scaffold:** `Button` has a `focus-visible` ring.
- **In the scaffold:** the offer filter is a labelled `role="group"` of buttons with `aria-pressed`, so a screen reader announces which filter is active. A Radix `ToggleGroup` would add arrow-key roving focus on top; adopt it when a second toggle row appears.

---

## Journey audit

Each row is a gap between the patterns above and the code observed above. They are
listed for follow-up; rows marked **Fixed** were closed by a later change.

| Journey        | Gap                                                                                                                                           | Where                                                                              | Pattern |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| Claim an offer | **Fixed:** losing the race (HTTP 409) now reads as a plain outcome ("Missed it", then whether it was claimed or retired), not destructive red | `src/components/quirk/OffersBoard.tsx`; `src/app/api/offers/[id]/claim/route.ts:9` | 7, 8    |
| Claim an offer | **Fixed:** the API client now throws `QuirkApiError` with the HTTP status, and `isConflict()` tells a lost race from a failure                | `src/lib/quirk/client.ts`                                                          | 7       |
| Claim an offer | **Fixed:** the selected filter is mirrored to `?status=`, so a reload or a shared link keeps it                                               | `OffersBoard.tsx`; `src/app/quirk/offers/page.tsx`                                 | 7       |
| Filter offers  | **Fixed:** the filter buttons sit in a labelled group and expose `aria-pressed`                                                               | `OffersBoard.tsx`                                                                  | 2, 9    |
| Subscribe      | Hand-rolled `<button>` instead of the `Button` primitive                                                                                      | `src/app/pricing/page.tsx:22`                                                      | 1, 3    |
| Subscribe      | No pending state, so a slow redirect invites a double submit                                                                                  | `src/app/pricing/page.tsx:22`                                                      | 7       |
| Subscribe      | Stripe returns to `/pricing?status=success` or `?status=cancel`, but the page never reads it                                                  | `src/app/pricing/actions.ts` (success and cancel URLs); `page.tsx`                 | 7       |

---

## Checklist for a new component

1. Does a shadcn primitive already cover it? Add that instead.
2. Behaviour from a headless primitive, styling from tokens through the theme.
3. Visual options as `cva` variants; no boolean style props.
4. Parts with `data-slot`, composed by the caller.
5. Server Component unless it needs interaction.
6. For anything that moves money or a claim: every state in the table under pattern 7, with copy for each.
7. Keyboard path and accessible name checked; a unit test for logic, an E2E test for the journey.

---

## References

- shadcn/ui: https://ui.shadcn.com
- Radix Primitives: https://www.radix-ui.com/primitives
- class-variance-authority: https://cva.style
- Scaffold conventions: `CLAUDE.md` (Components, Styling, Quirk Offers)
