// CANDIDATE / STATE_ONLY / TEST-ONLY. Synthetic fixtures, never authority evidence.
const NOW = "2026-09-09T12:00:00.000Z";
const EXPIRES = "2026-09-10T12:00:00.000Z";
const PLACEHOLDER_DIGEST = `sha256:${"0".repeat(64)}`;

export function rehash(contracts, value, domain) {
  const { contentDigest: _ignored, ...basis } = value;
  value.contentDigest = contracts.digestCanonical(basis, domain);
  return value;
}

function parseHashed(contracts, schema, value, domain) {
  const parsed = schema.parse({ ...value, contentDigest: PLACEHOLDER_DIGEST });
  return schema.parse(rehash(contracts, parsed, domain));
}

export function makeFixture(
  contracts,
  {
    authority = "PERMITTED_CANDIDATE_ONLY",
    history = "clean",
    action = "probe.select_candidate_b",
    classification,
  } = {},
) {
  const policyRevision = contracts.digestCanonical(
    { fixture: "mode-a-policy" },
    "quirk.composition.fixture-policy-state.v1",
  );
  const policy = {
    kind: "CompositionAdapterPolicy",
    version: "1",
    policyRevision,
    actionTaxonomyVersion: "mode-a-test.v1",
    maxHistory: 32,
    actions: [
      {
        actionId: "probe.select_candidate_a",
        operationId: "operation.select.a",
        toolId: "tool.candidate",
        classification: "CANDIDATE_STATE",
      },
      {
        actionId: "probe.select_candidate_b",
        operationId: "operation.select.b",
        toolId: "tool.candidate",
        classification: "CANDIDATE_STATE",
      },
      {
        actionId: "probe.revise_rationale",
        operationId: "operation.revise.rationale",
        toolId: "tool.candidate",
        classification: "PURE",
      },
      {
        actionId: "probe.publish_external",
        operationId: "operation.publish.external",
        toolId: "tool.candidate",
        classification: "EXTERNAL_EFFECT",
      },
    ],
    forbiddenPairs: [["probe.select_candidate_a", "probe.select_candidate_b"]],
    forbiddenOrderedTriples: [],
  };
  const selectedAction = policy.actions.find(
    (entry) => entry.actionId === action,
  );
  if (!selectedAction) throw new Error(`Unknown fixture action: ${action}`);
  const proposal = parseHashed(
    contracts,
    contracts.AgentProposalSchema,
    {
      kind: "AgentProposal",
      protocolVersion: "0.1.0",
      proposalId: "proposal.test",
      runId: "run.test",
      proposerPrincipalId: "principal.candidate-author",
      objective: "Prepare one unsigned candidate selection or rationale.",
      proposedCapabilityId: "capability.candidate",
      proposedMoveId: "move.candidate",
      requestedEffect: {
        effectId: "effect.candidate",
        tribunalEffect: "recommend",
        operationId: selectedAction.operationId,
        targetClass: "target.candidate",
        targetLocator: "fixture://candidate/slot.test",
      },
      expectedPriorStateDigest: contracts.digestCanonical(
        { fixture: "prior" },
        "quirk.composition.fixture-prior.v1",
      ),
      expectedStateDelta: "An unsigned in-memory candidate may be prepared.",
      alternativesConsidered: ["Keep the current candidate."],
      rejectedAlternatives: [],
      assumptions: ["All data and principals are synthetic fixtures."],
      evidenceClaimIds: [],
      estimatedCostUsd: 0,
      estimatedDurationMs: 1,
      effectClass: "REVERSIBLE",
      proposedAt: NOW,
      expiration: EXPIRES,
    },
    "quirk.governed-run.agent-proposal.v1",
  );
  const instruction = (id, directive) => ({
    instructionId: id,
    issuerPrincipalId: "principal.policy",
    sourceKind: "POLICY",
    tier: 0,
    directive,
    effectId: proposal.requestedEffect.effectId,
    issuedAt: NOW,
    expiresAt: null,
    sourceDigest: policyRevision,
  });
  const instructionNodes =
    authority === "UNRESOLVED"
      ? [
          instruction("instruction.allow", "ALLOW"),
          instruction("instruction.review", "REQUIRE_HUMAN_REVIEW"),
        ]
      : [
          instruction(
            "instruction.primary",
            authority === "PROHIBITED"
              ? "DENY"
              : authority === "HUMAN_REVIEW"
                ? "REQUIRE_HUMAN_REVIEW"
                : "ALLOW",
          ),
        ];
  const authorityValue = parseHashed(
    contracts,
    contracts.ManyTierAuthorityResolutionSchema,
    {
      kind: "ManyTierAuthorityResolution",
      protocolVersion: "0.1.0",
      resolutionId: "proposal.test.authority",
      proposalId: proposal.proposalId,
      instructionNodes,
      instructionEdges:
        authority === "UNRESOLVED"
          ? [
              {
                fromInstructionId: "instruction.allow",
                toInstructionId: "instruction.review",
                relation: "CONFLICTS_WITH",
              },
            ]
          : [],
      canonicalPrincipalIds: ["principal.policy"],
      activeAuthorityGrantIds: ["grant.synthetic.complete"],
      applicablePolicyIds: ["policy.fixture"],
      winningInstructionIds: instructionNodes.map(
        (entry) => entry.instructionId,
      ),
      suppressedInstructionIds: [],
      unresolvedConflictIds:
        authority === "UNRESOLVED"
          ? instructionNodes.map((entry) => entry.instructionId)
          : [],
      permittedEffects:
        authority === "PERMITTED_CANDIDATE_ONLY"
          ? [structuredClone(proposal.requestedEffect)]
          : [],
      prohibitedEffects:
        authority === "PROHIBITED"
          ? [structuredClone(proposal.requestedEffect)]
          : [],
      requiredHumanReview:
        authority === "HUMAN_REVIEW" ? [proposal.requestedEffect.effectId] : [],
      result: authority,
      policyStateDigest: policyRevision,
      evaluatedAt: NOW,
    },
    "quirk.governed-run.authority-resolution.v1",
  );
  const agencyLocus = parseHashed(
    contracts,
    contracts.AgencyLocusDeclarationSchema,
    {
      kind: "AgencyLocusDeclaration",
      protocolVersion: "0.1.0",
      declarationId: "agency.test",
      goalOriginatorPrincipalId: "principal.user",
      proposalAuthorPrincipalId: "principal.candidate-author",
      plannerPrincipalId: "principal.planner",
      authorityIssuerPrincipalIds: ["principal.policy"],
      policyDeciderId: "policy.state-only",
      candidateBuilderPrincipalId: "principal.builder",
      intendedExecutorPrincipalId: "principal.executor",
      affectedPrincipalIds: ["principal.user"],
      acceptanceOwnerPrincipalId: "principal.user",
      reversalOwnerPrincipalId: "principal.user",
      accountablePrincipalId: "principal.user",
      triggerOrigin: "USER",
      humanInterventionPoints: ["review.independent"],
    },
    "quirk.governed-run.agency-locus.v1",
  );
  const trustedHistoryHandle = Symbol("trusted-fixture-history");
  const request = {
    proposal,
    authorityResult: { ok: true, value: authorityValue, issues: [] },
    policyResult: null,
    agencyLocus,
    operations: [
      {
        operationId: selectedAction.operationId,
        classification: classification ?? selectedAction.classification,
        toolId: selectedAction.toolId,
        containsSecretMaterial: false,
      },
    ],
    scope: {
      runId: proposal.runId,
      sessionId: "session.test",
      tenantId: "quirk",
      environment: "simulation",
      decisionSlotId: "slot.test",
    },
    historyHandle: trustedHistoryHandle,
    bindings: {},
  };
  const snapshot = {
    scope: structuredClone(request.scope),
    policyRevision,
    actionTaxonomyVersion: policy.actionTaxonomyVersion,
    complete: true,
    events:
      history === "prohibited"
        ? [
            {
              eventId: "event.1",
              actionId: "probe.select_candidate_a",
              status: "SIMULATED_ACCEPTED",
              provenance: "SIMULATION",
            },
          ]
        : [],
    headDigest: "",
  };
  if (history === "incomplete") snapshot.complete = false;
  const fixture = {
    policy,
    request,
    snapshot,
    resolveHistory(handle) {
      return handle === trustedHistoryHandle &&
        !["untrusted", "missing"].includes(history)
        ? snapshot
        : null;
    },
    refreshBindings({
      historyHead = true,
      basePolicy = true,
      sourceDigests = true,
    } = {}) {
      if (sourceDigests) {
        rehash(
          contracts,
          request.proposal,
          "quirk.governed-run.agent-proposal.v1",
        );
        rehash(
          contracts,
          request.authorityResult.value,
          "quirk.governed-run.authority-resolution.v1",
        );
        rehash(
          contracts,
          request.agencyLocus,
          "quirk.governed-run.agency-locus.v1",
        );
      }
      if (basePolicy)
        request.policyResult = contracts.decideStateOnlyExecution({
          runId: request.proposal.runId,
          proposal: request.proposal,
          authorityResolution: request.authorityResult.value,
          agencyLocus: request.agencyLocus,
          operations: request.operations,
          policyStateDigest: policy.policyRevision,
          now: new Date(NOW),
          expiresAt: new Date(EXPIRES),
        });
      if (request.policyResult.ok)
        contracts.ExecutionPolicyDecisionSchema.parse(
          request.policyResult.value,
        );
      if (historyHead) {
        const { headDigest: _ignored, ...basis } = snapshot;
        snapshot.headDigest = contracts.digestCanonical(
          basis,
          "quirk.composition.history.v1",
        );
      }
      request.bindings = {
        proposalDigest: request.proposal.contentDigest,
        authorityResolutionDigest: request.authorityResult.value.contentDigest,
        policyStateDigest: policy.policyRevision,
        scopeDigest: contracts.digestCanonical(
          request.scope,
          "quirk.composition.scope.v1",
        ),
        historyHeadDigest: snapshot.headDigest,
        actionTaxonomyVersion: policy.actionTaxonomyVersion,
        compositionPolicyDigest: contracts.digestCanonical(
          policy,
          "quirk.composition.policy.v1",
        ),
        operationsDigest: contracts.digestCanonical(
          request.operations,
          "quirk.composition.operations.v1",
        ),
      };
      return fixture;
    },
  };
  fixture.refreshBindings();
  return fixture;
}
