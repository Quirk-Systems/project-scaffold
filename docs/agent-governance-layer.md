# Quirk Agent Governance Layer

> Make agent power legible before making it stronger.

This layer turns the eleven Quirk control primitives into a multi-platform
contract system. Each primitive declares what an agent may do, what evidence it
must produce, and how to recover when something goes wrong. The artifacts in
this repository are the source-of-truth; platform integrations read them as
policy.

## Control primitives

| #   | Primitive                                                                              | Purpose                                                  | Platform anchor                                    |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| 1   | [Capability Surface](control-primitives/capability-surface.md)                         | Declare exactly what an agent can touch.                 | Cloudflare allowlist, Supabase capability metadata |
| 2   | [Permission Knife](control-primitives/permission-knife.md)                             | Narrow, time-boxed, retractable grants.                  | Supabase RLS, Cloudflare revocation set            |
| 3   | [Evidence Receipt](control-primitives/evidence-receipt.md)                             | Signed, timestamped record of agent action.              | Supabase audit ledger, Cloudflare Logspush         |
| 4   | [Refusal Receipt](control-primitives/refusal-receipt.md)                               | Record why an agent refused and on what authority.       | Supabase audit ledger, Vercel UI                   |
| 5   | [Source Resilience Score](control-primitives/source-resilience-score.md)               | Rank sources by verifiability and diversity.             | Supabase source registry, Hugging Face evals       |
| 6   | [Agent Spawn Gate](control-primitives/agent-spawn-gate.md)                             | Require a contract, owner, and evidence sink before run. | Cloudflare Durable Object, Vercel UI               |
| 7   | [Model Substitution Test](control-primitives/model-substitution-test.md)               | Verify prompts behave on frontier and open models.       | OpenAI + Hugging Face lanes, CI                    |
| 8   | [Externality Receipt](control-primitives/externality-receipt.md)                       | Declare side effects and rollback plans.                 | Supabase ledger, GitHub issue dispatch             |
| 9   | [Apprenticeship Continuity Test](control-primitives/apprenticeship-continuity-test.md) | Shadow a mentor before independent operation.            | Vercel operator UI, judgment ranker                |
| 10  | [Reversibility Ledger](control-primitives/reversibility-ledger.md)                     | Every mutating action has a compensating action.         | Supabase ledger, Cloudflare workflow               |
| 11  | [Judgment Ranker](control-primitives/judgment-ranker.md)                               | Transparent rubric for candidate outputs.                | Vercel UI, training annotations                    |

## Containment Contract

The [Containment Contract](../schemas/quirk-containment-contract.schema.json) is
the minimum deployable governance unit. It binds three primitives together:

- **Capability Surface** — what the agent is allowed to do.
- **Permission Knife** — the grants that narrow and time-box that surface.
- **Evidence Receipt** — the audit policy that records what actually happened.

No agent runs without a signed containment contract. The contract is versioned,
reviewed, and stored in Git. Supabase projects it; Cloudflare enforces it.

## Platform map

| Platform         | Governance responsibility                                                                   | Artifacts consumed                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Cloudflare**   | Runtime fence, Durable Object run locks, kill switch, replay path, logs.                    | Capability Surface, Permission Knife, Spawn Gate, Reversibility Ledger |
| **Supabase**     | Governance ledger, RLS-backed receipts, audit tables, source registry, capability metadata. | All receipts, ledgers, scores, contracts                               |
| **GitHub**       | Issue dispatch, PR review, agent task contracts, evidence gates.                            | Agent task template, externality receipts, judgment ranker output      |
| **Vercel**       | Operator UI, AI SDK tool interfaces, run observability, model gateway lane.                 | Spawn Gate, receipts, ranker, approval flows                           |
| **OpenAI**       | Frontier model lane and production agent capability provider.                               | Model Substitution Test baseline                                       |
| **Hugging Face** | Open-model substitution lane and safety/eval benchmark discovery.                           | Model Substitution Test substitute, Source Resilience Score evaluator  |

## Repository layout

```
docs/
  agent-governance-layer.md           # this file
  control-primitives/*.md             # doctrine, fields, example, enforcement
diagrams/
  agent-governance-layer.mmd          # system map
schemas/
  quirk-*.schema.json                 # machine-readable primitive contracts
templates/
  *.yaml                              # example governance contracts
.github/
  ISSUE_TEMPLATE/agent-task.yml       # scoped agent task form
  workflows/validate-governance-contracts.yml
```

## Acceptance criteria

- [x] Each primitive has a doctrine, required fields, example YAML, and enforcement note.
- [x] Containment Contract connects to Capability Surface, Permission Knife, and Evidence Receipt.
- [x] GitHub task template requires scope, risk class, review owner, and evidence.
- [x] Supabase schema plan supports contracts, receipts, tool calls, approvals, and incidents.
- [x] Cloudflare runtime plan defines allowlists, durable run locks, kill switch, and replay path.
- [x] Vercel UI plan defines operator views for runs, traces, approvals, and receipts.
- [x] Model Substitution Test includes OpenAI and Hugging Face/open-model lanes.
- [x] Mermaid diagram is committed as source.
