-- Quirk Design Tribunal private evidence ledger.
-- Candidate migration: apply only to an isolated Supabase branch before production.

create schema if not exists quirk_internal;

comment on schema quirk_internal is
  'Server-only Quirk runtime evidence. Canonical definitions remain in versioned repository contracts.';

revoke all on schema quirk_internal from public, anon, authenticated;
grant usage on schema quirk_internal to service_role;

create table if not exists quirk_internal.design_review_runs (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid references public.quirk_assets(id) on delete restrict,
  baseline_asset_id uuid references public.quirk_assets(id) on delete set null,
  mode text not null check (mode in ('lite', 'standard', 'one_of_one')),
  artifact_kind text not null check (
    artifact_kind in (
      'app', 'surface', 'component', 'design_system', 'document', 'template',
      'campaign', 'email', 'deck', 'service', 'skill', 'experience', 'other'
    )
  ),
  artifact_locator text not null,
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  quality_bar jsonb not null check (jsonb_typeof(quality_bar) = 'array'),
  budget jsonb not null check (jsonb_typeof(budget) = 'object'),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  requested_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists quirk_internal.design_review_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references quirk_internal.design_review_runs(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'run_started', 'gate_completed', 'critic_completed', 'referee_completed',
      'repair_requested', 'repair_completed', 'budget_exhausted',
      'review_completed', 'review_failed'
    )
  ),
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  actor_id text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists quirk_internal.design_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references quirk_internal.design_review_runs(id) on delete restrict,
  criterion_id text not null,
  critic_role text not null check (
    critic_role in ('design_systems', 'experience', 'quirk_distinctiveness', 'referee')
  ),
  verdict text not null check (verdict in ('pass', 'fail', 'unresolved')),
  severity text not null check (severity in ('blocker', 'major', 'minor', 'note')),
  claim text not null check (length(btrim(claim)) > 0),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array'),
  remediation text,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  blocks_release boolean not null default false,
  resolution_status text not null check (
    resolution_status in ('open', 'fixed', 'waived', 'false_alarm', 'verified')
  ),
  created_at timestamptz not null default now()
);

create table if not exists quirk_internal.design_comparisons (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references quirk_internal.design_review_runs(id) on delete restrict,
  candidate_a_asset_id uuid not null references public.quirk_assets(id) on delete restrict,
  candidate_b_asset_id uuid not null references public.quirk_assets(id) on delete restrict,
  blind_labels jsonb not null check (jsonb_typeof(blind_labels) = 'object'),
  winner text not null check (winner in ('a', 'b', 'tie', 'unresolved')),
  rationale text not null check (length(btrim(rationale)) > 0),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz not null default now(),
  check (candidate_a_asset_id <> candidate_b_asset_id)
);

create table if not exists quirk_internal.design_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references quirk_internal.design_review_runs(id) on delete restrict,
  decision text not null check (
    decision in ('proposed', 'approved', 'rejected', 'waived', 'superseded')
  ),
  authority_type text not null check (authority_type in ('human', 'system')),
  authority_id text not null,
  rationale text not null check (length(btrim(rationale)) > 0),
  evidence_snapshot jsonb not null default '{}'::jsonb check (
    jsonb_typeof(evidence_snapshot) = 'object'
  ),
  created_at timestamptz not null default now(),
  check (decision <> 'approved' or authority_type = 'human')
);

create index if not exists design_review_events_run_created_idx
  on quirk_internal.design_review_events (run_id, created_at);
create index if not exists design_findings_run_severity_idx
  on quirk_internal.design_findings (run_id, severity, created_at);
create index if not exists design_findings_open_idx
  on quirk_internal.design_findings (run_id, blocks_release)
  where resolution_status = 'open';
create index if not exists design_comparisons_run_idx
  on quirk_internal.design_comparisons (run_id, created_at);
create index if not exists design_decisions_run_created_idx
  on quirk_internal.design_decisions (run_id, created_at);

alter table quirk_internal.design_review_runs enable row level security;
alter table quirk_internal.design_review_events enable row level security;
alter table quirk_internal.design_findings enable row level security;
alter table quirk_internal.design_comparisons enable row level security;
alter table quirk_internal.design_decisions enable row level security;

revoke all on all tables in schema quirk_internal from public, anon, authenticated;
grant select, insert on all tables in schema quirk_internal to service_role;

create or replace function quirk_internal.reject_update_delete()
returns trigger
language plpgsql
set search_path = pg_catalog, quirk_internal
as $$
begin
  raise exception '% is append-only; append a new event, finding, comparison, or decision instead', tg_table_name
    using errcode = '55000';
end;
$$;

revoke all on function quirk_internal.reject_update_delete() from public, anon, authenticated;
grant execute on function quirk_internal.reject_update_delete() to service_role;

drop trigger if exists design_review_runs_append_only on quirk_internal.design_review_runs;
create trigger design_review_runs_append_only
before update or delete on quirk_internal.design_review_runs
for each row execute function quirk_internal.reject_update_delete();

drop trigger if exists design_review_events_append_only on quirk_internal.design_review_events;
create trigger design_review_events_append_only
before update or delete on quirk_internal.design_review_events
for each row execute function quirk_internal.reject_update_delete();

drop trigger if exists design_findings_append_only on quirk_internal.design_findings;
create trigger design_findings_append_only
before update or delete on quirk_internal.design_findings
for each row execute function quirk_internal.reject_update_delete();

drop trigger if exists design_comparisons_append_only on quirk_internal.design_comparisons;
create trigger design_comparisons_append_only
before update or delete on quirk_internal.design_comparisons
for each row execute function quirk_internal.reject_update_delete();

drop trigger if exists design_decisions_append_only on quirk_internal.design_decisions;
create trigger design_decisions_append_only
before update or delete on quirk_internal.design_decisions
for each row execute function quirk_internal.reject_update_delete();

comment on table quirk_internal.design_review_runs is
  'Immutable review request. Later state is represented by append-only events and decisions.';
comment on table quirk_internal.design_findings is
  'Evidence-backed critic findings. Resolutions are new rows or events; historical findings are never rewritten.';
comment on table quirk_internal.design_decisions is
  'Append-only release and admission decisions. Approved decisions require explicit human authority.';
