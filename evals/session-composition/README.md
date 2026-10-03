# Session Composition Closure Probe — preregistration

Status: CANDIDATE / STATE_ONLY / TEST-ONLY. This directory is not a production
policy engine, runtime adapter, authority issuer, or admitted capability.

## Question and scope

Can a deny-only session composition filter reject explicitly prohibited combinations
of individually permitted synthetic actions while preserving matched controls?
The comparator is a deliberately action-local reference, NOT an executable copy
of PR #102 and NOT a claim that current Quirk production admits these sequences.
PR #102 is a plan, not an implemented Mode A runtime. All action strings are
`probe.*` fixture labels. No tools, data flows, or effects are executed.

## Exact source baseline

- Owner: Quirk-Systems/project-scaffold.
- PR #98: 58d73b083293b745c126b2031b4295e74417e1d5 (Tribunal).
- PR #101: a1fa33d23af95fc7fdc29cf41cfd03fd30d2f610 (design).
- PR #102: 47279f5f9cbee8dfcb97b21ca3da024294f1bad9 (plan).
- Plan blob: 82a5105dbde190d3145cf8cdf0c4d0c2570b0dbe.
- Plan file: docs/superpowers/plans/2026-08-28-governed-agent-run-state-only.md.
- Task 4 was inspected in lines 1050–1450 of the pinned plan; inspect its
  resolver signature and implementation before changing production contracts. It takes proposal/grants/instructions/policy/time, not prior actions.
- Research motivation: https://arxiv.org/html/2608.15888v1, submitted 2026-08-16;
  sections 4.6–4.8. Pair co-occurrence and ordered-subsequence restrictions are
  distinct. We do not reproduce APC, its benchmark, signatures, or delegation algebra.

## Frozen sample, before target implementation

Fixture SHA-256: `34c08a8ecf0e4688efcc6a944879b841f11415045c65cb6b918a559337958f45`.
12 prohibited traces (2–3 actions) plus 12 paired controls, six restriction families:
two unordered-pair families, each with forward/reverse/interleaved/repeated-prefix
variants, and four ordered-triple families. Variants are correlated; 24 cases are
not 24 independent mechanisms and are not a population sample.
Each base decision is stipulated `true` to isolate composition from grant validity.
Controls replace one sensitive/source or terminal action; expected labels are
fixed here, not generated from the implementation under test.

## Method and pass/stop rules

1. Keep fixtures frozen. Build and test the action-local comparator.
2. Observe target tests fail with a deliberately memoryless implementation.
3. Implement only a pure deny-only composition filter and rerun the same sample.
4. Add edge checks (unverified/incomplete history, scope mismatch, unknown action,
   false base decision, overflow, repeated actions, pair order, triple ordering).
5. Check the pair/triple logic against a separately implemented enumerative oracle
   across all sequences up to length four from a six-symbol bounded alphabet.
6. Ablate pair and triple checks separately; tests must detect both regressions.

Required result: target rejects all 12 prohibited traces; permits all 12 controls;
never permits a false base decision; always reports effectExecutionAllowed=false.
Stop escalation on a control false denial, ambiguous fixture taxonomy, any effect
path, need to change #98 semantics, or unavailable trusted integration boundary.
Diagnostic failures remain in verification logs. Do not re-label fixtures to pass.

## Ownership, timing and approval

Maintainer/decision owner: Bryan Sayler (bryansayler). Test author/operator: ChatGPT.
Permission basis: Bryan's `Continue @Superpowers @GitHub @Supabase` following the
bounded experiment proposal. This authorizes this test-only candidate branch,
not merge, Canon admission, B/C execution, or DB writes. Independent review is
still required. Evaluation occurs during this session; timestamps go in the receipt.

## Authority and operational boundaries

No model or provider calls, package installation, secrets, application DB reads/writes,
network requests, executor port, production imports, new runtime schema, or deployment.
Local fixture/result files and a draft GitHub review branch are the only write targets.
An allow result means candidate eligibility inside the simulation only.
No new AuthorityGrant/EvaluatorDeclaration/EvidenceClaim dialect is introduced.

Supabase metadata was checked: INACTIVE; schema query timed out. No schema readiness
is asserted and no recovery/resume/migration is attempted.

## What passing cannot prove

No live Quirk integration, no signed history, no model attack success rates, no
semantic action classifier, no real data-flow/parameter/taint analysis, no complete
restriction taxonomy, no durable cross-run memory, no concurrent admission lock,
no independent human evaluation, no full repository CI, no production safety.
Session/history/policy are supplied by this trusted test harness. A future runtime
must authenticate them; this script cannot detect an omitted history that a trusted
caller falsely labels complete. Policy changes, inherited child-session state,
retention and expiry, race-free admission, and postcondition evidence require
separate integration proofs. Do not call an empty history a new authorization.

## Reproduce without installing anything

```sh
node --test evals/session-composition/probe.test.mjs
node evals/session-composition/run.mjs
```

Tested locally with Node v22.16.0. The repository's Bun/Vitest/type-check/build
suite was not run: Bun and installed project dependencies are absent here.
No dependency, package script, workflow, runtime export, or application code changes
are included. This experiment does not claim CI coverage by merely being in Git.

## Observed local result — 2026-09-09

48 Node test cases passed. The fixed 12 prohibited traces were candidate-permitted
by the deliberately memoryless reference, and all 12 were denied by the deny-only
composition filter. Both preserved all 12 matched controls. An independent
index-enumeration oracle agreed on 1,554 additional nonempty sequences from a
six-symbol alphabet, length 1–4. This is bounded combinatorial coverage, not
statistical sampling, corpus exhaustiveness, or semantic safety validation.

Removing pair checks caused nine test failures; removing triple checks caused six;
erasing history caused fourteen (before the later report-only test was added).
This demonstrates that the tests notice those specific regressions. It does not
show that an independent reviewer or live runtime has verified the implementation.

## Candidate integration recommendation — not applied

Add a history-aware, deny-only constraint to the existing Mode A policy boundary.
Keep #98's authority roles and verified-grant handling unchanged. The eventual
consumer must resolve a trusted session/tenant/environment identity, action-taxonomy
version, policy revision, complete history head and inherited delegation history.
Do not take those values from an LLM's claim of prior actions. Distinguish proposed,
denied, simulated, reserved, committed, failed and unknown-outcome operations;
never write this simulation as an EffectReceipt.

In B/C, check-and-reserve admission must serialize against that history before
an effect; failed/unknown outcomes and retries must not silently clear constraints.
That concurrency test is outside this probe. Policy changes, source revocation,
redacted history, session resets, delegated children and human exceptions also
need separate fixtures before any runtime binding. A closed-world action taxonomy
cannot detect omitted real-world data flows just by matching names.

The actionable finding is a candidate test obligation for Task 4/5 of PR #102,
not proof that a production Quirk deployment is vulnerable or repaired.
Mode A remains state-only. B/C activation, migrations and merges remain gated.
