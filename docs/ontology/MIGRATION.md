# Ontology projection and Supabase posture

Migration `0003_ontology_registry.sql` creates a private `ontology` schema,
projection/history tables, and covering foreign-key indexes. It also:

- revokes public, `anon`, and `authenticated` execution from every overload of
  `public.rls_auto_enable()` when that helper exists;
- enables RLS and revokes Data API roles from existing server-only public
  tables;
- revokes Data API roles from the ontology schema and all of its objects;
- creates no client policies, views, or functions.

The application currently treats these tables as server-only. Keep
`ontology` out of Supabase's exposed schemas. If a client surface is needed,
add a narrowly scoped authenticated function or a `security_invoker` view
after a separate permission review; never expose projection tables directly.
New helper functions belong outside `public` and must have `PUBLIC`, `anon`,
and `authenticated` execution revoked unless explicitly required.

## Deployment verification

Run the migration with the normal `db:migrate` workflow, project a known Git
commit, and compare each projected payload/hash/path/SHA with its canonical
file. Then run Supabase Security and Performance Advisors. Record the advisor
run with the deployment evidence and do not release with a new high-impact
finding. A live advisor baseline cannot be produced without access to the
target Supabase project.
