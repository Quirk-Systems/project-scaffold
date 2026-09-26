# OSS Component Admission Contract

The OSS Component Admission Contract governs external tools, adapters, plugins, runtimes, and hosted integrations before they can be relied on in Quirk workflows.

## Canonical stance

Imported tools may provide capability. Quirk contracts decide authority. Quirk Evidence decides admissibility. Quirk Ledger preserves accountable change.

## Invariants (always fail closed)

- `component_availability_implies_authority = false`
- `component_popularity_implies_admission = false`
- `github_stars_imply_quality = false`
- `oss_license_implies_safe_to_use = false`
- `hosted_platform_implies_runtime_authority = false`
- `plugin_installation_implies_permission = false`
- `adapter_success_implies_canon = false`
- `component_evidence_implies_decision = false`

## Validator

Run:

```bash
bun run oss-component-admission:validate
```

This checks:

- positive fixtures parse and pass contract rules;
- adversarial fixtures fail closed with expected rule codes;
- authority, canon, secret, evidence-laundering, and cross-surface invariants;
- Airtable evidence is never canonical evidence.

## Files

- Schema: `schemas/governance/oss-component-admission.schema.json`
- Validator: `scripts/validate-oss-component-admission.ts`
- Fixtures: `fixtures/oss-components/positive/` and `fixtures/oss-components/adversarial/`
- Template: `templates/oss-component-admission.example.yaml`
