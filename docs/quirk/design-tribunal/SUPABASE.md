# Supabase Projection and Safety Posture

## Current evidence — 2026-08-11

The connected Quirk Supabase project is healthy on Postgres 17. Existing Quirk tables have RLS enabled and no client policies, producing a fail-closed, server-only posture. The Design Tribunal migration preserves that posture.

No production DDL is applied by this pack. There is no existing development branch, and branch creation requires a separate cost confirmation. The draft PR carries the migration so it can be reviewed and tested through an isolated preview or approved development branch before production.

## Projection boundary

Canonical definitions live in repository contracts and docs. Supabase stores runtime evidence and decisions; it does not define the ontology.

The projection contains:

- immutable review requests
- append-only run events
- append-only findings
- blind comparisons
- append-only human/system decisions

## Security posture

- schema: `quirk_internal`
- no `anon` or `authenticated` grants
- RLS enabled with no client policies
- explicit `service_role` read/insert grants
- update/delete rejected by trigger on evidence and decision tables
- no `SECURITY DEFINER` function
- no browser-facing views or RPCs
- approved decisions require `authority_type = 'human'`

## Migration authority warning

This repository currently uses Drizzle migrations for application schema, while Supabase platform migrations are also present remotely. Do not let two migration managers independently own the same objects.

This pack places the private ledger in `supabase/migrations/` as a reviewable candidate because it is Supabase-specific security DDL. Before merge, make one explicit decision:

1. **Supabase owns `quirk_internal`:** keep this migration and exclude the private schema from Drizzle generation; or
2. **Drizzle owns it:** translate the migration into Drizzle schema plus generated journal/snapshot and remove the Supabase migration.

The draft must not claim complete database integration until that authority decision and an isolated apply/rollback test are evidenced.

## Required verification

1. Apply on preview/development branch.
2. Confirm all five tables exist in `quirk_internal`.
3. Confirm RLS is enabled.
4. Confirm `anon` and `authenticated` have no schema/table privileges.
5. Confirm `service_role` can insert/select.
6. Confirm update/delete attempts fail on append-only tables.
7. Confirm an `approved` decision with `authority_type = 'system'` fails.
8. Run security and performance advisors.
9. Capture rollback or branch reset proof.
10. Generate TypeScript types after the migration authority is settled.
11. Attach evidence to the draft PR before release claims.
