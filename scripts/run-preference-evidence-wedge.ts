import {
  FIXED_PREFERENCE_SCOPE,
  PREFERENCE_EDGE_CONFIRM_SCOPE,
  PREFERENCE_PROJECT_DECISION_SCOPE,
  confirmLearnedPreference,
  decidePreferenceMove,
  evaluatePreferenceEvidence,
  executePreferenceMove,
  issueAuthorityGrant,
  proposePreferenceMove,
} from "@/lib/quirk/preference-evidence";

const verifierSecret = "local-demo-only-preference-authority-secret";
const actor = {
  actor_type: "human" as const,
  actor_id: "user:example",
  subject_relation: "self" as const,
  authentication: {
    status: "authenticated" as const,
    session_ref: "authn:example-session",
  },
};
const evaluation = evaluatePreferenceEvidence({
  predicate: "presentation.response_density",
  value: "balanced",
  subject: { kind: "authenticated_self", subject_id: actor.actor_id },
  scope: { ...FIXED_PREFERENCE_SCOPE },
  evidence: {
    type: "explicit_user_statement",
    sensitivity: "non_sensitive",
    statement:
      "For repository audit reports in this project, use balanced response density.",
    captured_at: "2026-08-21T10:00:00Z",
    actor,
  },
  validity: {
    not_before: "2026-08-21T10:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
  },
  system_default: false,
});
const move = proposePreferenceMove({
  evaluation,
  requestedEffect: "project_only",
  scope: { ...FIXED_PREFERENCE_SCOPE },
  proposedAt: "2026-08-21T10:01:00Z",
});
const decisionToken = issueAuthorityGrant(
  {
    grantId: "grant-project-decision",
    issuer: actor.actor_id,
    subject: `preference-proposal:${move.proposal.id}`,
    scopes: [PREFERENCE_PROJECT_DECISION_SCOPE],
    issuedAt: "2026-08-21T10:00:00.000Z",
    expiresAt: "2026-08-21T11:00:00.000Z",
    nonce: "nonce-project-decision",
    binding: {
      kind: "preference_proposal",
      id: move.proposal.id,
      contentSha256: move.proposal.content_sha256,
    },
  },
  verifierSecret,
);
const decision = decidePreferenceMove(move, {
  outcome: "approved",
  actor,
  explicit: true,
  scope: { ...FIXED_PREFERENCE_SCOPE },
  approvedEffects: ["project_only"],
  decidedAt: "2026-08-21T10:02:00Z",
  expiresAt: "2026-12-31T00:00:00Z",
  simulatedAt: "2026-08-21T10:03:00Z",
  recordedAt: "2026-08-21T10:04:00Z",
  authorityToken: decisionToken,
  verifierSecret,
});
if (!decision.authorized)
  throw new Error("demo decision was unexpectedly rejected");
const receipt = executePreferenceMove(decision);
if (!receipt.receipt) throw new Error("demo projection receipt is missing");
const confirmationToken = issueAuthorityGrant(
  {
    grantId: "grant-edge-confirmation",
    issuer: actor.actor_id,
    subject: `preference-receipt:${receipt.receipt.id}`,
    scopes: [PREFERENCE_EDGE_CONFIRM_SCOPE],
    issuedAt: "2026-08-21T10:04:00.000Z",
    expiresAt: "2026-08-21T11:00:00.000Z",
    nonce: "nonce-edge-confirmation",
    binding: {
      kind: "preference_receipt",
      id: receipt.receipt.id,
      contentSha256: receipt.receipt.content_sha256,
    },
  },
  verifierSecret,
);
const result = confirmLearnedPreference(receipt, {
  actor,
  explicit: true,
  scope: { ...FIXED_PREFERENCE_SCOPE },
  predicate: "presentation.response_density",
  value: "balanced",
  confirmedAt: "2026-08-21T10:05:00Z",
  expiresAt: "2026-12-30T00:00:00Z",
  authorityToken: confirmationToken,
  verifierSecret,
});

console.log(JSON.stringify(result, null, 2));
