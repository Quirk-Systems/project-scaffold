import { z } from "zod";

const admissionStatusSchema = z.enum([
  "candidate",
  "admitted",
  "quarantined",
  "deprecated",
  "rejected",
]);

const authorityScopeSchema = z.enum([
  "writes",
  "external_calls",
  "production_execution",
  "publication",
  "canon_mutation",
  "secret_access",
  "evaluator_verdicts",
]);

const evidenceOutputSchema = z.enum([
  "traces",
  "scan_results",
  "eval_scores",
  "policy_decisions",
  "receipts",
  "provenance",
  "decision_receipts",
]);

const riskLevelSchema = z.enum(["low", "medium", "high"]);

const ossComponentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    source: z
      .object({
        homepage: z.string().url(),
        repository: z.string().url(),
        package: z.string().min(1),
        license: z.string().min(1),
        maintainers: z.array(z.string().min(1)),
      })
      .strict(),
    primary_layer: z.string().min(1),
    quirk_role: z.string().min(1),
    admission_status: admissionStatusSchema,
    boundaries: z
      .object({
        owns_canon: z.boolean(),
        may_grant_authority: z.boolean(),
        may_store_secrets: z.boolean(),
        may_define_ontology: z.boolean(),
        may_define_memory_truth: z.boolean(),
        may_emit_evidence: z.boolean(),
        may_execute_runtime_actions: z.boolean(),
      })
      .strict(),
    required_authority_grants_for: z.array(authorityScopeSchema),
    evidence_outputs: z.array(evidenceOutputSchema),
    integration_surfaces: z
      .object({
        github: z.boolean(),
        supabase: z.boolean(),
        vercel: z.boolean(),
        cloudflare: z.boolean(),
        temporal: z.boolean(),
        airtable: z.boolean(),
        agent_ready: z.boolean(),
        plugin_autopilot: z.boolean(),
        plugin_eval: z.boolean(),
        code_ontology_companion: z.boolean(),
      })
      .strict(),
    risk: z
      .object({
        failure_modes: z.array(z.string().min(1)),
        stale_doc_risk: riskLevelSchema,
        supply_chain_risk: riskLevelSchema,
        secret_handling_risk: riskLevelSchema,
        lock_in_risk: riskLevelSchema,
        authority_laundering_risk: riskLevelSchema,
        evidence_laundering_risk: riskLevelSchema,
      })
      .strict(),
    evaluation: z
      .object({
        required_fixtures: z.array(z.string().min(1)),
        tribunal_declaration_required: z.boolean(),
        authority_grant_required: z.boolean(),
        eval_of_eval_required: z.boolean(),
      })
      .strict(),
    provenance: z
      .object({
        canonical_path: z.string().min(1),
        content_hash: z.string().min(1),
        reviewed_by: z.string().min(1),
        reviewed_at: z.string().datetime(),
        supersedes: z.string(),
        superseded_by: z.string(),
      })
      .strict(),
  })
  .strict();

export const ossComponentAdmissionFixtureSchema = z
  .object({
    oss_component: ossComponentSchema,
    authority_grant_refs: z.array(z.string().min(1)).default([]),
    admission_evidence: z.array(z.string().min(1)).default([]),
    canonical_evidence_refs: z.array(z.string().min(1)).default([]),
    decision_inputs: z.array(z.string().min(1)).default([]),
    runtime_behavior_claims: z.array(z.string().min(1)).default([]),
    secret_data_paths: z.array(z.string().min(1)).default([]),
    documentation_current: z.boolean().default(true),
    cross_surface_authority_reuse: z.boolean().default(false),
    expected_failures: z.array(z.string().min(1)).optional(),
  })
  .strict();

export type OssComponentAdmissionFixture = z.infer<
  typeof ossComponentAdmissionFixtureSchema
>;

export type OssComponentAdmissionValidation = {
  valid: boolean;
  errors: string[];
};

const CANONICAL_SUBSTRATE_IDS = new Set(["quirk.canonical.substrate"]);

const REQUIRED_GRANT_SCOPES = new Set<string>([
  "writes",
  "external_calls",
  "secret_access",
]);

const FORBIDDEN_ADMISSION_EVIDENCE = [
  {
    code: "popularity_not_admission_evidence",
    pattern: /(stars?|installs?|popularity|github_stars|downloads?)/i,
  },
  {
    code: "license_not_safety_evidence",
    pattern: /(license|mit|apache|bsd).*(safe|security|admit|trust)/i,
  },
  {
    code: "adapter_success_not_canon",
    pattern: /(adapter|integration)_success.*canon/i,
  },
  {
    code: "plugin_install_not_permission",
    pattern:
      /(plugin(_|-)installed|plugin_install).*(permission|authorized|authority)/i,
  },
  {
    code: "platform_env_not_authority",
    pattern: /(env(_|-)var|runtime_env|NEXT_PUBLIC).*(authority|permission)/i,
  },
  {
    code: "evidence_claim_not_authority",
    pattern:
      /(scan_result|eval_score|tool_output).*(authority|permission|final_decision)/i,
  },
];

function anyMatches(values: string[], pattern: RegExp): boolean {
  return values.some((value) => pattern.test(value));
}

export function validateOssComponentAdmission(
  input: unknown,
): OssComponentAdmissionValidation {
  const parsed = ossComponentAdmissionFixtureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: [
        ...new Set(
          parsed.error.issues.map(
            ({ path, code }) => `schema_invalid:${path.join(".")}:${code}`,
          ),
        ),
      ],
    };
  }

  const fixture = parsed.data;
  const component = fixture.oss_component;
  const errors = new Set<string>();

  if (
    component.boundaries.owns_canon &&
    !CANONICAL_SUBSTRATE_IDS.has(component.id)
  ) {
    errors.add("owns_canon_requires_quirk_substrate");
  }

  if (component.boundaries.may_grant_authority) {
    errors.add("component_cannot_grant_authority");
  }

  if (
    component.boundaries.may_store_secrets ||
    fixture.secret_data_paths.length > 0
  ) {
    errors.add("component_cannot_store_secrets_as_data");
  }

  if (component.evidence_outputs.includes("decision_receipts")) {
    errors.add("evidence_claim_cannot_be_decision_receipt");
  }

  const needsGrantRef = component.required_authority_grants_for.some((scope) =>
    REQUIRED_GRANT_SCOPES.has(scope),
  );
  if (needsGrantRef && fixture.authority_grant_refs.length === 0) {
    errors.add("authority_grant_reference_required");
  }

  for (const rule of FORBIDDEN_ADMISSION_EVIDENCE) {
    if (anyMatches(fixture.admission_evidence, rule.pattern)) {
      errors.add(rule.code);
    }
  }

  if (
    fixture.canonical_evidence_refs.some((value) => /^airtable:/i.test(value))
  ) {
    errors.add("airtable_cannot_be_canonical_evidence");
  }

  if (
    component.integration_surfaces.code_ontology_companion &&
    fixture.runtime_behavior_claims.length > 0
  ) {
    errors.add("static_ontology_not_runtime_causality");
  }

  if (
    fixture.decision_inputs.some((value) =>
      /(tool_output|scan_result|eval_score).*final_decision/i.test(value),
    )
  ) {
    errors.add("tool_output_not_final_decision");
  }

  if (
    !fixture.documentation_current &&
    fixture.admission_evidence.some((value) => /^docs:/i.test(value))
  ) {
    errors.add("stale_docs_not_implementation_proof");
  }

  if (fixture.cross_surface_authority_reuse) {
    errors.add("cross_surface_authority_not_reusable");
  }

  return { valid: errors.size === 0, errors: [...errors].sort() };
}
