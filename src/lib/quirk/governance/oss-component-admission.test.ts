import { describe, expect, it } from "vitest";
import { validateOssComponentAdmission } from "./oss-component-admission";
import { parse } from "yaml";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const validComponent = {
  oss_component: {
    id: "component.agent-ready",
    name: "Agent Ready",
    version: "1.0.0",
    source: {
      homepage: "https://example.com/agent-ready",
      repository: "https://github.com/example/agent-ready",
      package: "npm:agent-ready@1.0.0",
      license: "MIT",
      maintainers: ["Example Maintainer"],
    },
    primary_layer: "evidence",
    quirk_role: "external readability checks",
    admission_status: "candidate",
    boundaries: {
      owns_canon: false,
      may_grant_authority: false,
      may_store_secrets: false,
      may_define_ontology: false,
      may_define_memory_truth: false,
      may_emit_evidence: true,
      may_execute_runtime_actions: false,
    },
    required_authority_grants_for: [
      "writes",
      "external_calls",
      "production_execution",
      "publication",
      "canon_mutation",
      "secret_access",
      "evaluator_verdicts",
    ],
    evidence_outputs: [
      "traces",
      "scan_results",
      "eval_scores",
      "policy_decisions",
    ],
    integration_surfaces: {
      github: true,
      supabase: false,
      vercel: false,
      cloudflare: false,
      temporal: false,
      airtable: false,
      agent_ready: true,
      plugin_autopilot: false,
      plugin_eval: false,
      code_ontology_companion: false,
    },
    risk: {
      failure_modes: ["stale_docs"],
      stale_doc_risk: "medium",
      supply_chain_risk: "medium",
      secret_handling_risk: "low",
      lock_in_risk: "low",
      authority_laundering_risk: "medium",
      evidence_laundering_risk: "medium",
    },
    evaluation: {
      required_fixtures: ["readability-fence"],
      tribunal_declaration_required: true,
      authority_grant_required: true,
      eval_of_eval_required: false,
    },
    provenance: {
      canonical_path: "fixtures/oss-components/positive/agent-ready.yaml",
      content_hash: "sha256:placeholder",
      reviewed_by: "human:tribunal",
      reviewed_at: "2026-09-26T00:00:00.000Z",
      supersedes: "",
      superseded_by: "",
    },
  },
  authority_grant_refs: ["authority:grant:agent-ready-v1"],
  admission_evidence: ["fixture:readability-fence"],
  canonical_evidence_refs: [
    "git:schemas/governance/oss-component-admission.schema.json",
  ],
  runtime_behavior_claims: [],
};

describe("validateOssComponentAdmission", () => {
  it("accepts a well-formed positive component fixture", () => {
    const result = validateOssComponentAdmission(validComponent);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("fails closed for popularity laundering", () => {
    const result = validateOssComponentAdmission({
      ...validComponent,
      admission_evidence: ["github_stars:12000"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("popularity_not_admission_evidence");
  });

  it("fails closed for authority-granting components", () => {
    const result = validateOssComponentAdmission({
      ...validComponent,
      oss_component: {
        ...validComponent.oss_component,
        boundaries: {
          ...validComponent.oss_component.boundaries,
          may_grant_authority: true,
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("component_cannot_grant_authority");
  });

  it("fails closed when authority grant references are missing", () => {
    const result = validateOssComponentAdmission({
      ...validComponent,
      authority_grant_refs: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("authority_grant_reference_required");
  });

  it("requires authority grant references when authority_grant_required is true", () => {
    const result = validateOssComponentAdmission({
      ...validComponent,
      authority_grant_refs: [],
      oss_component: {
        ...validComponent.oss_component,
        required_authority_grants_for: [],
        evaluation: {
          ...validComponent.oss_component.evaluation,
          authority_grant_required: true,
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("authority_grant_reference_required");
  });

  it("enforces all fixture expectations", () => {
    const positiveDir = resolve(
      process.cwd(),
      "fixtures/oss-components/positive",
    );
    const adversarialDir = resolve(
      process.cwd(),
      "fixtures/oss-components/adversarial",
    );

    for (const file of readdirSync(positiveDir).filter((entry) =>
      entry.endsWith(".yaml"),
    )) {
      const fixture = parse(readFileSync(resolve(positiveDir, file), "utf8"));
      const result = validateOssComponentAdmission(fixture);
      expect(result.valid, `${file} should pass`).toBe(true);
    }

    for (const file of readdirSync(adversarialDir).filter((entry) =>
      entry.endsWith(".yaml"),
    )) {
      const fixture = parse(
        readFileSync(resolve(adversarialDir, file), "utf8"),
      ) as {
        expected_failures?: string[];
      };
      const result = validateOssComponentAdmission(fixture);
      expect(result.valid, `${file} should fail`).toBe(false);
      for (const code of fixture.expected_failures ?? []) {
        expect(result.errors, `${file} missing ${code}`).toContain(code);
      }
    }
  });
});
