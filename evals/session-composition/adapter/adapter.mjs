/** Candidate-only adapter experiment. No executor, persistence, or authority issuer. */
import { z } from "zod";
import { checkCompositionCandidate } from "../gate.mjs";

const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const id = z.string().min(1).max(80);
const Scope = z
  .object({
    runId: id,
    sessionId: id,
    tenantId: id,
    environment: z.literal("simulation"),
    decisionSlotId: id,
  })
  .strict();
const Operation = z
  .object({
    operationId: id,
    toolId: id,
    classification: z.enum([
      "PURE",
      "CANDIDATE_STATE",
      "EXTERNAL_EFFECT",
      "UNKNOWN",
    ]),
    containsSecretMaterial: z.boolean(),
  })
  .strict();
const Action = Operation.omit({ containsSecretMaterial: true })
  .extend({
    actionId: z.string().regex(/^probe\.[a-z_]{1,64}$/),
  })
  .strict();
const Policy = z
  .object({
    kind: z.literal("CompositionAdapterPolicy"),
    version: id,
    policyRevision: digest,
    actionTaxonomyVersion: id,
    maxHistory: z.literal(32),
    actions: z.array(Action).min(1).max(64),
    forbiddenPairs: z.array(z.tuple([id, id])).max(64),
    forbiddenOrderedTriples: z.array(z.tuple([id, id, id])).max(64),
  })
  .strict();
const Event = z
  .object({
    eventId: id,
    actionId: id,
    status: z.enum([
      "PROPOSED",
      "SIMULATED_ACCEPTED",
      "DENIED",
      "RESERVED",
      "COMMITTED",
      "FAILED",
      "UNKNOWN_OUTCOME",
    ]),
    provenance: z.literal("SIMULATION"),
  })
  .strict();
const History = z
  .object({
    scope: Scope,
    policyRevision: digest,
    actionTaxonomyVersion: id,
    complete: z.literal(true),
    events: z.array(Event).max(32),
    headDigest: digest,
  })
  .strict();
const Bindings = z
  .object({
    proposalDigest: digest,
    authorityResolutionDigest: digest,
    policyStateDigest: digest,
    scopeDigest: digest,
    historyHeadDigest: digest,
    actionTaxonomyVersion: id,
    compositionPolicyDigest: digest,
    operationsDigest: digest,
  })
  .strict();
const Issue = z
  .object({ code: id, path: z.string(), refs: z.array(z.string()) })
  .strict();
const Result = (schema) =>
  z.discriminatedUnion("ok", [
    z
      .object({ ok: z.literal(true), value: schema, issues: z.tuple([]) })
      .strict(),
    z
      .object({
        ok: z.literal(false),
        value: z.null(),
        issues: z.array(Issue).min(1),
      })
      .strict(),
  ]);
const withoutDigest = ({ contentDigest: _, ...value }) => value;
const withoutHead = ({ headDigest: _, ...value }) => value;

/**
 * resolveHistory is a trusted, synchronous fixture-owned resolver. Its opaque
 * handles model an upstream verifier; this experiment does not authenticate
 * durable history or grants. A JSON field asserting trust is never consulted.
 */
export function createCompositionAdapter({
  contracts,
  policy,
  resolveHistory,
}) {
  const {
    AgentProposalSchema,
    ManyTierAuthorityResolutionSchema,
    AgencyLocusDeclarationSchema,
    ExecutionPolicyDecisionSchema,
    digestCanonical,
  } = contracts;
  const hash = (value, domain) =>
    digestCanonical(value, `quirk.composition.${domain}.v1`);
  const Request = z
    .object({
      proposal: AgentProposalSchema,
      authorityResult: Result(ManyTierAuthorityResolutionSchema),
      policyResult: Result(ExecutionPolicyDecisionSchema),
      agencyLocus: AgencyLocusDeclarationSchema,
      operations: z.array(Operation).length(1),
      scope: Scope,
      historyHandle: z.unknown(),
      bindings: Bindings,
    })
    .strict();
  let fixedPolicy;
  try {
    hash(policy, "policy"); // Reject noncanonical object graphs before parsing.
    fixedPolicy = Policy.parse(policy);
    const actions = new Set(fixedPolicy.actions.map((a) => a.actionId));
    const operations = new Set(fixedPolicy.actions.map((a) => a.operationId));
    if (
      actions.size !== fixedPolicy.actions.length ||
      operations.size !== actions.size ||
      [
        ...fixedPolicy.forbiddenPairs,
        ...fixedPolicy.forbiddenOrderedTriples,
      ].some(
        (pattern) =>
          new Set(pattern).size !== pattern.length ||
          pattern.some((a) => !actions.has(a)),
      )
    )
      throw new Error("INVALID_POLICY");
  } catch {
    fixedPolicy = null;
  }

  function finish({
    request = null,
    effectivePolicyResult = null,
    reasonCodes,
    eligible = false,
  }) {
    const basis = {
      kind: "CompositionConstraintCandidate",
      status: "CANDIDATE",
      candidateEligible: eligible,
      effectExecutionAllowed: false,
      productionValidation: false,
      authorityResult: request?.authorityResult ?? null,
      basePolicyResult: request?.policyResult ?? null,
      effectivePolicyResult,
      bindings: request?.bindings ?? null,
      reasonCodes: [...new Set(reasonCodes)].sort(),
    };
    // Canonical hashing refuses shared references; each receipt field is an
    // independent snapshot. This also keeps caller mutations out of the result.
    const snapshot = JSON.parse(JSON.stringify(basis));
    return {
      ...snapshot,
      contentDigest: hash(snapshot, "constraint-candidate"),
    };
  }

  return function evaluate(raw) {
    let request = null;
    try {
      if (!fixedPolicy) return finish({ reasonCodes: ["INVALID_POLICY"] });
      if (typeof resolveHistory !== "function")
        return finish({ reasonCodes: ["UNTRUSTED_HISTORY"] });
      // The opaque handle is intentionally outside serialization and output.
      const { historyHandle: _, ...serializable } = raw;
      hash(serializable, "input");
      request = Request.parse(raw);
      const reasons = [];
      let authority = null;
      let basePolicy = null;
      if (!request.authorityResult.ok) reasons.push("AUTHORITY_RESULT_FAILED");
      else authority = request.authorityResult.value;
      if (!request.policyResult.ok) reasons.push("BASE_POLICY_FAILED");
      else basePolicy = request.policyResult.value;
      const checkDigest = (object, domain) =>
        object.contentDigest === digestCanonical(withoutDigest(object), domain);
      if (
        !checkDigest(
          request.proposal,
          "quirk.governed-run.agent-proposal.v1",
        ) ||
        !checkDigest(
          request.agencyLocus,
          "quirk.governed-run.agency-locus.v1",
        ) ||
        (authority &&
          !checkDigest(
            authority,
            "quirk.governed-run.authority-resolution.v1",
          )) ||
        (basePolicy &&
          !checkDigest(basePolicy, "quirk.governed-run.execution-policy.v1"))
      ) {
        reasons.push("SOURCE_DIGEST_MISMATCH");
      }
      const operation = request.operations[0];
      const action = fixedPolicy.actions.find(
        (item) => item.operationId === operation.operationId,
      );
      if (
        !action ||
        action.classification !== operation.classification ||
        action.toolId !== operation.toolId ||
        request.proposal.requestedEffect.operationId !== operation.operationId
      )
        reasons.push("ACTION_TAXONOMY_MISMATCH");
      if (
        !["PURE", "CANDIDATE_STATE"].includes(operation.classification) ||
        operation.containsSecretMaterial
      ) {
        reasons.push("OPERATION_INELIGIBLE");
      }
      if (
        request.scope.runId !== request.proposal.runId ||
        (authority &&
          (authority.proposalId !== request.proposal.proposalId ||
            authority.policyStateDigest !== fixedPolicy.policyRevision))
      ) {
        reasons.push("SOURCE_BINDING_MISMATCH");
      }
      if (authority) {
        const exactEffect = (effects) =>
          effects.length === 1 &&
          hash(effects[0], "requested-effect") ===
            hash(request.proposal.requestedEffect, "requested-effect");
        const permitted = authority.result === "PERMITTED_CANDIDATE_ONLY";
        const prohibited = authority.result === "PROHIBITED";
        if (
          (permitted
            ? !exactEffect(authority.permittedEffects)
            : authority.permittedEffects.length !== 0) ||
          (prohibited
            ? !exactEffect(authority.prohibitedEffects)
            : authority.prohibitedEffects.length !== 0) ||
          (permitted &&
            (authority.activeAuthorityGrantIds.length === 0 ||
              authority.requiredHumanReview.length > 0 ||
              authority.unresolvedConflictIds.length > 0)) ||
          (authority.result === "HUMAN_REVIEW" &&
            !authority.requiredHumanReview.includes(
              request.proposal.requestedEffect.effectId,
            )) ||
          (authority.result === "UNRESOLVED" &&
            authority.unresolvedConflictIds.length === 0)
        ) {
          reasons.push("AUTHORITY_RESULT_INCONSISTENT");
        }
      }
      if (basePolicy && authority) {
        const expectedDecision =
          authority.result === "PERMITTED_CANDIDATE_ONLY"
            ? "ALLOW_CANDIDATE_ONLY"
            : authority.result === "HUMAN_REVIEW"
              ? "REQUIRE_HUMAN_REVIEW"
              : "DENY";
        if (
          basePolicy.runId !== request.scope.runId ||
          basePolicy.proposalDigest !== request.proposal.contentDigest ||
          basePolicy.authorityResolutionDigest !== authority.contentDigest ||
          basePolicy.agencyLocusDigest !== request.agencyLocus.contentDigest ||
          basePolicy.policyStateDigest !== fixedPolicy.policyRevision ||
          (basePolicy.decision !== "DENY" &&
            basePolicy.decision !== expectedDecision) ||
          JSON.stringify([...basePolicy.grantIds].sort()) !==
            JSON.stringify([...authority.activeAuthorityGrantIds].sort())
        ) {
          reasons.push("SOURCE_BINDING_MISMATCH");
        }
        if (
          basePolicy.decision !== "DENY" &&
          (basePolicy.deniedOperationIds.length !== 0 ||
            JSON.stringify(
              [...basePolicy.permittedPreparatoryOperationIds].sort(),
            ) !== JSON.stringify([operation.operationId]))
        ) {
          reasons.push("OPERATION_SET_MISMATCH");
        }
        if (
          authority.requiredHumanReview.length > 0 &&
          basePolicy.decision === "ALLOW_CANDIDATE_ONLY"
        )
          reasons.push("HUMAN_REVIEW_OBLIGATION");
        if (
          authority.unresolvedConflictIds.length > 0 &&
          basePolicy.decision !== "DENY"
        )
          reasons.push("UNRESOLVED_AUTHORITY");
        if (
          Date.parse(basePolicy.evaluatedAt) >=
            Date.parse(basePolicy.expiresAt) ||
          Date.parse(request.proposal.proposedAt) >
            Date.parse(basePolicy.evaluatedAt) ||
          Date.parse(request.proposal.expiration) <=
            Date.parse(basePolicy.evaluatedAt) ||
          Date.parse(authority.evaluatedAt) > Date.parse(basePolicy.evaluatedAt)
        ) {
          reasons.push("SOURCE_TIME_INCONSISTENT");
        }
      }
      const bindings = request.bindings;
      if (
        bindings.proposalDigest !== request.proposal.contentDigest ||
        (authority &&
          bindings.authorityResolutionDigest !== authority.contentDigest) ||
        bindings.policyStateDigest !== fixedPolicy.policyRevision ||
        bindings.scopeDigest !== hash(request.scope, "scope") ||
        bindings.actionTaxonomyVersion !== fixedPolicy.actionTaxonomyVersion ||
        bindings.compositionPolicyDigest !== hash(fixedPolicy, "policy") ||
        bindings.operationsDigest !== hash(request.operations, "operations")
      )
        reasons.push("DECISION_BINDING_MISMATCH");

      let history = null;
      try {
        const resolved = resolveHistory(raw.historyHandle);
        hash(resolved, "history-input");
        history = History.parse(resolved);
        if (
          history.headDigest !== hash(withoutHead(history), "history") ||
          history.headDigest !== bindings.historyHeadDigest ||
          hash(history.scope, "scope") !== bindings.scopeDigest ||
          history.policyRevision !== fixedPolicy.policyRevision ||
          history.actionTaxonomyVersion !== fixedPolicy.actionTaxonomyVersion
        )
          reasons.push("HISTORY_BINDING_MISMATCH");
        if (
          new Set(history.events.map((event) => event.eventId)).size !==
          history.events.length
        )
          reasons.push("DUPLICATE_HISTORY_EVENT");
        for (const event of history.events) {
          const historicalAction = fixedPolicy.actions.find(
            (item) => item.actionId === event.actionId,
          );
          if (!historicalAction) reasons.push("UNKNOWN_HISTORY_ACTION");
          if (
            !["PROPOSED", "DENIED", "SIMULATED_ACCEPTED"].includes(event.status)
          )
            reasons.push("UNSUPPORTED_HISTORY_STATE");
          if (
            event.status === "SIMULATED_ACCEPTED" &&
            !["PURE", "CANDIDATE_STATE"].includes(
              historicalAction?.classification,
            )
          )
            reasons.push("INELIGIBLE_HISTORY_ACTION");
        }
      } catch {
        reasons.push("UNTRUSTED_OR_INCOMPLETE_HISTORY");
      }

      if (
        reasons.length === 0 &&
        authority &&
        basePolicy &&
        history &&
        action
      ) {
        const scope = {
          sessionId: request.scope.sessionId,
          tenantId: request.scope.tenantId,
          environment: "simulation",
        };
        const outcome = checkCompositionCandidate(
          {
            mode: "STATE_ONLY",
            scope,
            policyVersion: fixedPolicy.version,
            historyComplete: true,
            priorActions: history.events
              .filter((event) => event.status === "SIMULATED_ACCEPTED")
              .map((event) => event.actionId),
            action: action.actionId,
            // Evaluate restrictions independently of base permission so a denial
            // can coexist with an unresolved human-review obligation.
            baseAllowed: true,
          },
          {
            kind: "SyntheticCompositionPolicy",
            version: fixedPolicy.version,
            authorityEffect: "NONE",
            scope,
            knownActions: fixedPolicy.actions.map((item) => item.actionId),
            forbiddenPairs: fixedPolicy.forbiddenPairs,
            forbiddenOrderedTriples: fixedPolicy.forbiddenOrderedTriples,
            maxHistory: 32,
          },
        );
        if (!outcome.candidateAllowed)
          reasons.push(
            outcome.reason === "INVALID_FIXTURE_INPUT"
              ? "INVALID_COMPOSITION_INPUT"
              : "COMPOSITION_PROHIBITED",
          );
      }

      let effective = request.policyResult;
      if (reasons.length > 0 && basePolicy) {
        const basis = {
          ...withoutDigest(basePolicy),
          decision: "DENY",
          permittedPreparatoryOperationIds: [],
          deniedOperationIds: [
            ...new Set([
              ...basePolicy.deniedOperationIds,
              operation.operationId,
            ]),
          ].sort(),
          policyReasonCodes: [
            ...new Set([
              ...basePolicy.policyReasonCodes,
              "policy.state_only.composition_denied",
            ]),
          ].sort(),
        };
        effective = {
          ok: true,
          value: ExecutionPolicyDecisionSchema.parse({
            ...basis,
            contentDigest: digestCanonical(
              basis,
              "quirk.governed-run.execution-policy.v1",
            ),
          }),
          issues: [],
        };
      }
      const eligible =
        reasons.length === 0 &&
        authority?.result === "PERMITTED_CANDIDATE_ONLY" &&
        basePolicy?.decision === "ALLOW_CANDIDATE_ONLY";
      return finish({
        request,
        effectivePolicyResult: effective,
        eligible,
        reasonCodes: reasons.length
          ? reasons
          : [eligible ? "CANDIDATE_ONLY" : "BASE_OBLIGATIONS_PRESERVED"],
      });
    } catch {
      return finish({
        request,
        reasonCodes: [
          request ? "CONSTRAINT_CONSTRUCTION_FAILED" : "INVALID_ADAPTER_INPUT",
        ],
      });
    }
  };
}
