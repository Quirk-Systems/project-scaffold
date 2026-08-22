# Tribunal compatibility contract

Status: **candidate / draft PR**  
Protocol: `1.0.0`  
Canonical runtime: Zod contracts in `src/lib/quirk/design-tribunal/`  
Human authority: preserved

Tribunal is a compatibility contract for evidence-bearing evaluation. It is not
a service, an evaluator, an authority issuer, or a database projection.

## Decision

Use the already-merged authority and Design Tribunal contracts as canon. Add
only the missing cross-domain bindings and a `TribunalCase` envelope. The five
roles remain, but they do not get five competing wire formats.

| Tribunal role          | Canonical source                                 | Compatibility responsibility                                                                                                                           |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AuthorityGrant`       | `governance/authority.ts`                        | Existing signed camelCase grant, unchanged and verified at runtime                                                                                     |
| `EvaluatorDeclaration` | `design-tribunal/protocol.ts`                    | Declares identity, structured source boundary, fallibility, content-addressed calibration, provenance, and requested grant subset                      |
| `EvidenceClaim`        | `DesignEvidence` plus protocol bindings          | Preserves the Design evidence object and binds subject, inspector, freshness, retention, derivation, and hashes                                        |
| `TribunalVerdict`      | `DesignFinding` adapter plus protocol bindings   | Binds criterion, stable claim, evaluator, grant, subject revision, derived evidence, uncertainty, dissent, and requested evaluator effect              |
| `DecisionReceipt`      | canonical `HumanDecision` plus protocol bindings | Binds the stable case basis, prior receipt, verdicts, evidence, grants, effect, time, replay nonce, reversibility, content hash, and human attestation |

`TribunalCase` is the non-authority-bearing root. It carries the case ID,
purpose, requester, named human authority, trajectory, deterministic evaluation
time, criteria/source references, subject revision/digest, proposed effect, and
operating scope.

## Canonical-source rule

The unmerged #98 snake_case grant and its handwritten JSON Schema are retired.
They are not migration inputs and are rejected with
`LEGACY_DIALECT_UNSUPPORTED`; mixed aliases are rejected with
`AMBIGUOUS_ALIAS`.

Zod is the only schema source in this slice. There is deliberately no manually
maintained JSON Schema. A future JSON Schema must be generated from canon and
checked for drift; it must never become a second editable definition. The
current project uses Zod 3, and adding an archived generator dependency solely
for this projection would weaken the supply-chain boundary. Native generation
can be reconsidered with a separately reviewed Zod 4 migration.

## Signed authority binding

The existing `AuthorityGrant` has a general `subject` and string scopes. The
compatibility layer reserves exact signed values instead of adding an unsigned
scope projection:

```text
subject = tribunal-case:<caseId>

quirk.tribunal.evaluate
quirk.tribunal.evaluator:<evaluatorId>
quirk.tribunal.realm:<realm>
quirk.tribunal.subject-id:<subjectId>
quirk.tribunal.subject:<sha256 subject revision>
quirk.tribunal.target-class:<targetClass>
quirk.tribunal.effect:<effect>
quirk.tribunal.purpose:<purposeId>
quirk.tribunal.tenant:<tenantId>
quirk.tribunal.audience:<audienceId>
quirk.tribunal.destination:<destinationId>
quirk.tribunal.action:<sha256 action>
```

Every declaration and verdict resolves one signed grant. Unowned,
declaration-only, shared, and proxy grants are invalid. Scope cannot be unioned
across evaluators. Confidence, consensus, history, evaluator type, and
meta-evaluation never add scopes. Delegation/proxy grants fail closed in v1. An
owned grant contains exactly one evaluator scope, belongs to one declaration,
and cannot be issued by that evaluator or its declared operator. Shared
operator or model-family axes are treated as correlated even when evaluators
choose different independence keys.

Grant validity is checked both at validation time and at the governed verdict
time. A later grant cannot retroactively authorize an earlier evaluation.

## Runtime contract

`validateTribunalCase(raw, context)` is deterministic and side-effect free. The
caller must inject:

- the evaluation clock;
- signed tokens by grant ID and the existing grant verifier;
- current grant lifecycle state (`active`, `revoked`, or `superseded`);
- trusted issuer and human-authority identities;
- an out-of-band receipt verifier that authenticates the full receipt and its
  content digest;
- evidence and calibration bytes by locator for digest verification;
- consumed human/case/nonce replay-key to receipt-digest state.

Missing verification, lifecycle, evidence, human attestation, or replay
infrastructure is a typed failure. Tokens and attestations are runtime-only and
must not be persisted in a `TribunalCase`, fixture, receipt, log, browser
bundle, or evidence payload.

The validator returns stable `{ code, path, refs }` issues; it does not throw on
untrusted input. Named limits bound string bytes, role collections, scopes,
graph depth, graph edges, serialized size, and authority-token length before
expensive ports run. It rejects duplicate IDs and set members before building
reference maps, resolves every edge, verifies content hashes, uses iterative
cycle detection, and groups disagreement by stable `claimId` plus subject
revision—not prose.
Internal evidence-claim edges bind the referenced claim's exact content digest.
Verdicts and decision receipts cannot be laundered into primary evidence.
Evidence must be observable for supported or contradicted verdicts and match
the verdict's criterion, stable claim, evaluator, structured allow/deny source
prefixes, inspection cutoff, and case trajectory. Deny prefixes take
precedence. Calibration is a separately resolved, content-addressed source;
freshness and holdout separation remain explicit.

Canonical JSON hashes use UTF-8, deterministic UTF-16 code-unit key ordering
and ECMAScript number serialization (the JSON Canonicalization Scheme ordering
model), a versioned encoding prefix, and a role-specific domain separator.
Resolved strings and `Uint8Array` values are normalized to the same UTF-8 byte
sequence under the evidence-byte domain. Issue ordering is locale-independent;
references are bounded and redacted before return. Unsafe cyclic, accessor,
non-plain, deep, or oversized inputs, invalid clocks, prototype-inherited or
oversized tokens, and throwing runtime ports fail with typed issues.

## Human gate

Evaluator effects and candidate effects are separate. A signed evaluator grant
may authorize observation, recommendation, or blocking without authorizing the
evaluated candidate action. Approval, publication, canon mutation, and verdict
promotion require an exact, authenticated, replay-checked `DecisionReceipt`
owned by the named trusted human authority. When receipt history exists, the
case names the unique latest receipt as effective. `rejected`, `waived`, and
`superseded` decisions never authorize execution; only an explicit `approved`
effective decision can open an authority-bearing effect. A receipt that omits
one side of a disagreement is irrelevant and cannot suppress the dispute.

The case-basis digest excludes decision history and the effective-receipt
selector. The genesis receipt has a null predecessor; each later receipt binds
the immediately previous receipt digest at a strictly later timestamp. This
makes appending a decision leave prior content and attestations unchanged. All
receipts remain hash- and attestation-checked. Exact-consumed historical
receipts are accepted as history; only the effective tip can emit a replay key
or fail as replayed. A different stored digest is tampering at any position.

`ok` means the complete case is valid; it is not itself execution permission.
Consumers may act only when `caseEffectAuthorized` is true. On any issue, every
derived verdict permission is forced false, verified-grant output is withheld,
and no replay key is emitted. A successful result returns
`receiptReplayKeysToConsume`; the executor must atomically compare-and-set those
keys before its idempotent effect and abort if another consumer wins.

## Agentic and experimental use

For execution-facing agents and experiments, treat the operating scope and
action digest as mandatory least-authority inputs. New integrations should:

1. generate the proposed action before evaluation and hash it;
2. resolve evidence bytes through a bounded adapter, never ambient network or
   filesystem access inside the validator;
3. keep model/provider metadata in evaluator declarations and use independent
   keys to expose correlated ensembles;
4. expire calibration and evidence, preserve holdout separation, and cap
   confidence at the calibrated range;
5. authenticate receipts out of band and persist grant lifecycle plus receipt
   replay state outside the pure contract;
6. pause on missing infrastructure or human authority;
7. log only typed issues and redacted references, never authority tokens or raw
   secret-bearing evidence;
8. atomically consume every returned replay key, make the downstream action
   idempotent, and preserve the receipt's rollback reference before any
   reversible effect executes;
9. require both a rollback reference and a deadline for reversible effects,
   then revalidate that the effective approved receipt's rollback window is
   still open at execution time;
10. persist the last authenticated receipt-chain head separately when
    anti-truncation across imports is required.

## Compatibility adapters

Adapters are explicit and fail closed:

- `DesignReviewRequest -> TribunalCase`: preserves request, artifact, criteria,
  source, and human-authority fields; the caller must supply revision, digest,
  realm, trajectory, operating scope, time, and the five role collections.
- `DesignEvidence -> EvidenceClaim`: preserves the source exactly; a missing
  digest is rejected rather than synthesized.
- `DesignFinding -> TribunalVerdict`: maps pass/fail/unresolved to
  supported/contradicted/insufficient, preserves `criterionId` and `runId`,
  rejects inactive fixed/waived/false-alarm findings, and derives evidence IDs
  and digests from a one-to-one match with the canonical finding evidence.
  Callers cannot substitute evidence through bindings. `blocksRelease` never
  becomes authority.
- `DesignHumanDecision -> DecisionReceipt`: embeds the canonical human decision
  and requires explicit case, role, effect, reversibility, time, and nonce
  bindings.

A single adapted receipt is selected as effective automatically. Decision
history with multiple receipts requires an explicit effective receipt; runtime
validation still requires that selection to be the unique latest receipt and
the tip of the immutable chain.

`DesignReviewReport.status` remains supporting context. It is not a receipt and
does not grant permission.

## Deliberate non-goals and next authority gates

This slice does not activate a database, model call, UI, deployment, delegation
graph, receipt-signing keyring, or grant revocation service. The runtime ports
are active and fail closed; durable implementations require separate authority
and data decisions.

The canonical fixture is generated from the runtime digest functions and CI
checks it for drift. Issue #97 stays open for templates, durable
lifecycle/replay/head storage, projection policy, a receipt-signing keyring,
and any generated schema projection. PR #66 is conceptual provenance only,
not ancestry.

## Release decision

**Constrain.** The contract is a draft compatibility candidate until the exact
PR head passes full CI and receives independent review. Do not merge, deploy,
admit to canon, or enable autonomous effects from this document.
