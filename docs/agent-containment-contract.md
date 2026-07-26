# Quirk Containment Contract

> Capability without containment is not autonomy. It is unmanaged reach.

Every agent must receive a concrete, schema-valid containment contract before
it starts. Preflight fails closed when a contract is absent, invalid, expired,
or inconsistent with the requested run. The contract is an enforceable fence,
not descriptive metadata.

## Preflight and enforcement

Before exposing context or tools, the runtime must:

1. Load and validate the assigned contract against
   [`schemas/agent-containment-contract.schema.json`](../schemas/agent-containment-contract.schema.json).
2. Restrict knowledge, tools, network, filesystem, credentials, runtime, and
   spend to the declared surfaces.
3. Bind the named shutdown authority and activate the kill switch.
4. Refuse destructive and out-of-scope actions. They cannot be approved within
   the current run; a human must issue a new contract.
5. Require approval metadata before each approval-gated write.
6. Append every tool call, approval, result, and verification to an immutable
   log and emit the appropriate receipt.

No contract means no start. A failed check emits a refusal receipt.

## The five boundaries

### 1. Bounded objective

The objective states the agent's mission, measurable success conditions,
explicit non-goals, stop conditions, risk class, and required postcondition.
The agent stops when any stop condition is met, even if the mission is
unfinished.

### 2. Bounded knowledge surface

The knowledge surface lists sources the agent may and may not inspect,
retrieve, remember, or reuse. It assigns a data-sensitivity class and specifies
citation or evidence requirements, retention, deletion, and whether derived
inferences may be created or reused. Anything not allowed is forbidden.

### 3. Bounded tool surface

Tools are split into read, prepare/draft, approval-gated write, and forbidden
sets. Undeclared tools are not discoverable. Every call needs a receipt.
Destructive and out-of-scope actions are denied, not merely approval-gated.

### 4. Bounded environment

The environment declares a network allowlist, blocked domains, credential
isolation, filesystem scope, runtime and cost limits, immutable logging, and
the sandbox or production execution tier. Evaluation and sandbox runs cannot
receive production credentials. A blocked-domain wildcard denies every
destination except an explicit network-allowlist entry.

### 5. Named human shutdown authority

Each contract names an owner and shutdown authority, escalation path, incident
review owner, kill-switch mechanism, and post-run review. Shutdown takes
priority over all objectives and approvals.

## Risk classes

| Class               | Permitted reach                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observe`           | Read allowed sources and produce evidence; no drafts, writes, or external acts.                                                                   |
| `prepare`           | Observe and create drafts in the declared sandbox; no external side effects.                                                                      |
| `act`               | Perform bounded, reversible writes only with explicit approval metadata.                                                                          |
| `consequential_act` | Perform specifically authorized high-impact actions with per-action approval, independent verification, and a tested rollback or escalation path. |

A risk class is a ceiling, not permission by itself. The narrower tool,
knowledge, and environment rules always win.

## Receipts and completion

Use
[`templates/agent-action-receipt.yaml`](../templates/agent-action-receipt.yaml)
for an action, completion, repair, rollback, or escalation. Use
[`templates/agent-refusal-receipt.yaml`](../templates/agent-refusal-receipt.yaml)
when preflight or an attempted action fails a boundary. Receipts identify the
contract, action, evidence, approval metadata, result, and verification.

A run completes only when its postcondition is independently checked. A failed
postcondition triggers repair, rollback, or escalation and the corresponding
receipt.

## Authoring and validation

Copy
[`templates/agent-containment-contract.yaml`](../templates/agent-containment-contract.yaml),
replace every example value, and run:

```bash
bun run containment:validate
```

CI runs the same command. Empty required boundaries, sandbox production
credentials, non-denial destructive policies, and missing shutdown authority
are schema errors.

## Workflow integration next step

Add a containment preflight adapter to each agent runtime before its tool
discovery and agentic loop. The adapter should accept a validated contract,
construct tool/network/filesystem allowlists, attach approval checks and
immutable receipt logging, and expose the kill switch. Until that adapter
exists for a workflow, the workflow must not claim containment enforcement.

Build the fence before praising the reach.
