# Halo candidate plan / Capricorn proof ledger

Version: 0.1 · 2026-11-01 · **not a deployment or admission receipt**.

## One deliverable

Accessible, one-fixture blind A/B/Neither preference trial with a deterministic, SHA-256-bound local decision receipt, a verifier, and adversarial tests. No model, network, database, automatic changes, inferred consent, or persistence.

## Verification ledger

| Gate | Expected | Observed | Status |
|---|---|---|---|
| L0 input provenance | Read prior SPEC & corrections or record gaps | Source gap recorded in CORRECTIONS.jsonl; Compounder Library SPEC consulted | RESOLVED WITH LIMITATIONS |
| L1 deterministic checks | Unit tests repeat and detect mutations | 10/10 pass with Node 22.16 | LOCAL_PASS |
| L2 DOM contract + simulated interaction | HTML controls; choose→approve→verify; Neither; reset; copy | 2/2 pass (synthetic DOM) | LOCAL_PASS_LIMITED |
| Real browser QA | Desktop/mobile screenshots, native keyboard and accessibility | 3 navigation attempts blocked by administrator; not demonstrated | BLOCKED / HUMAN_ESCALATION |
| Hosted CI exact-head | All required jobs run and pass | PENDING | UNVERIFIED |
| CIQ release threshold | 49/50 + hard gates | Provisional 46/50 (10 scope + 10 deterministic + 10 human gate + 8 UX + 8 reproducibility) | REJECT RELEASE / HOLD |

## Artificial cliffhanger — exactly one

**What happens when a stranger selects `Neither` twice?** Next authorized experiment must show whether a revised third option makes them voluntarily continue *without* weakening the opt-out or converting disagreement into preference consent.
