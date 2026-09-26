import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  AuthorityGrantSchema,
  DecisionReceiptSchema,
  EvaluatorDeclarationSchema,
  EvidenceClaimSchema,
  TribunalVerdictSchema,
  validateDecisionReceipt,
  validateVerdictAgainstGrant,
} from "../src/lib/quirk/governance/tribunal-protocol";

type JsonSchema = Record<string, unknown>;

const repoRoot = process.cwd();
const fixtureEvaluationNow = new Date("2026-09-26T12:00:00.000Z");

const schemaPairs = [
  {
    schema: "schemas/governance/authority-grant.schema.json",
    template: "templates/authority-grant.example.yaml",
  },
  {
    schema: "schemas/evaluation/evaluator-declaration.schema.json",
    template: "templates/evaluator-declaration.example.yaml",
  },
  {
    schema: "schemas/evidence/evidence-claim.schema.json",
    template: "templates/evidence-claim.example.yaml",
  },
  {
    schema: "schemas/evaluation/tribunal-verdict.schema.json",
    template: "templates/tribunal-verdict.example.yaml",
  },
  {
    schema: "schemas/governance/decision-receipt.schema.json",
    template: "templates/decision-receipt.example.yaml",
  },
] as const;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveRef(root: JsonSchema, ref: string): JsonSchema | null {
  if (!ref.startsWith("#/") || ref.includes("..")) return null;
  const segments = ref.slice(2).split("/");
  let current: unknown = root;
  for (const segment of segments) {
    const obj = asObject(current);
    if (!obj || !(segment in obj)) return null;
    current = obj[segment];
  }
  return asObject(current);
}

function validateWithSchema(
  schemaRoot: JsonSchema,
  schema: JsonSchema,
  data: unknown,
  at = "$",
): string[] {
  const errors: string[] = [];

  if (typeof schema.$ref === "string") {
    const resolved = resolveRef(schemaRoot, schema.$ref);
    if (!resolved) return [`${at}: unresolved $ref ${schema.$ref}`];
    return validateWithSchema(schemaRoot, resolved, data, at);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push(`${at}: value ${JSON.stringify(data)} not in enum`);
  }

  if (schema.type === "object") {
    const obj = asObject(data);
    if (!obj) return [`${at}: expected object`];

    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!(typeof key === "string" && key in obj)) {
        errors.push(`${at}: missing required key ${String(key)}`);
      }
    }

    const props = asObject(schema.properties) ?? {};
    const additional = schema.additionalProperties;
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in props)) {
        if (additional === false) errors.push(`${at}: unexpected key ${key}`);
        continue;
      }
      const childSchema = asObject(props[key]);
      if (childSchema) {
        errors.push(
          ...validateWithSchema(schemaRoot, childSchema, value, `${at}.${key}`),
        );
      }
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(data)) return [`${at}: expected array`];
    if (typeof schema.minItems === "number" && data.length < schema.minItems) {
      errors.push(`${at}: expected at least ${schema.minItems} items`);
    }
    const itemSchema = asObject(schema.items);
    if (itemSchema) {
      data.forEach((item, index) => {
        errors.push(
          ...validateWithSchema(
            schemaRoot,
            itemSchema,
            item,
            `${at}[${index}]`,
          ),
        );
      });
    }
  }

  if (schema.type === "string") {
    if (typeof data !== "string") return [`${at}: expected string`];
    if (
      typeof schema.minLength === "number" &&
      data.length < schema.minLength
    ) {
      errors.push(`${at}: expected min length ${schema.minLength}`);
    }
    if (schema.format === "date-time") {
      const isoWithOffset =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      if (!isoWithOffset.test(data) || Number.isNaN(Date.parse(data))) {
        errors.push(`${at}: invalid date-time with offset`);
      }
    }
  }

  if (schema.type === "number") {
    if (typeof data !== "number") return [`${at}: expected number`];
    if (typeof schema.minimum === "number" && data < schema.minimum) {
      errors.push(`${at}: expected >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && data > schema.maximum) {
      errors.push(`${at}: expected <= ${schema.maximum}`);
    }
  }

  if (schema.type === "boolean" && typeof data !== "boolean") {
    errors.push(`${at}: expected boolean`);
  }

  return errors;
}

function loadYaml(path: string): unknown {
  return parseYaml(readFileSync(join(repoRoot, path), "utf8"));
}

function loadJson(path: string): JsonSchema {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as JsonSchema;
}

function assertNoSecrets(paths: string[]): string[] {
  const blocked = [
    /NEXT_PUBLIC_OPENAI_API_KEY/,
    /sk-[A-Za-z0-9]{20,}/,
    /BEGIN(?: RSA)? PRIVATE KEY/,
  ];
  const violations: string[] = [];
  for (const rel of paths) {
    const content = readFileSync(join(repoRoot, rel), "utf8");
    for (const pattern of blocked) {
      if (pattern.test(content)) {
        violations.push(`${rel}: matched forbidden pattern ${pattern}`);
      }
    }
  }
  return violations;
}

function runFixture(path: string): string[] {
  const raw = loadYaml(path);
  const fixture = asObject(raw);
  if (!fixture) return [`${path}: fixture is not an object`];

  const expected = asObject(fixture.expected);
  if (!expected || typeof expected.admissible !== "boolean") {
    return [`${path}: expected.admissible must be boolean`];
  }

  const grant = AuthorityGrantSchema.parse(fixture.grant);
  const declaration = EvaluatorDeclarationSchema.parse(fixture.declaration);
  const evidence = zArray(EvidenceClaimSchema).parse(fixture.evidence_claims);
  const verdict = TribunalVerdictSchema.parse(fixture.verdict);
  const receipt = DecisionReceiptSchema.parse(fixture.decision_receipt);

  const verdictResult = validateVerdictAgainstGrant({
    grant,
    declaration,
    evidenceClaims: evidence,
    verdict,
    now: fixtureEvaluationNow,
  });
  const receiptResult = validateDecisionReceipt({
    receipt,
    verdict,
    grant,
    verdictAdmissible: verdictResult.ok,
  });

  const admissible = verdictResult.ok && receiptResult.ok;
  const reason = verdictResult.reason ?? receiptResult.reason;
  const errors: string[] = [];

  if (admissible !== expected.admissible) {
    errors.push(
      `${path}: expected admissible=${expected.admissible} but got ${admissible} (${reason ?? "ok"})`,
    );
  }

  if (typeof expected.reason === "string" && reason !== expected.reason) {
    errors.push(
      `${path}: expected reason=${expected.reason}, got ${reason ?? "ok"}`,
    );
  }

  return errors;
}

function zArray<T>(schema: { parse: (value: unknown) => T }): {
  parse: (value: unknown) => T[];
} {
  return {
    parse(value: unknown): T[] {
      if (!Array.isArray(value)) throw new Error("expected array");
      return value.map((item) => schema.parse(item));
    },
  };
}

const errors: string[] = [];

for (const pair of schemaPairs) {
  const schema = loadJson(pair.schema);
  const template = loadYaml(pair.template);
  errors.push(...validateWithSchema(schema, schema, template, pair.template));

  if (pair.template.includes("authority-grant"))
    AuthorityGrantSchema.parse(template);
  if (pair.template.includes("evaluator-declaration"))
    EvaluatorDeclarationSchema.parse(template);
  if (pair.template.includes("evidence-claim"))
    EvidenceClaimSchema.parse(template);
  if (pair.template.includes("tribunal-verdict"))
    TribunalVerdictSchema.parse(template);
  if (pair.template.includes("decision-receipt"))
    DecisionReceiptSchema.parse(template);
}

const positiveDir = join(repoRoot, "fixtures/tribunal/positive");
const adversarialDir = join(repoRoot, "fixtures/tribunal/adversarial");
const positive = readdirSync(positiveDir)
  .filter((name) => name.endsWith(".yaml"))
  .map((name) => `fixtures/tribunal/positive/${name}`);
const adversarial = readdirSync(adversarialDir)
  .filter((name) => name.endsWith(".yaml"))
  .map((name) => `fixtures/tribunal/adversarial/${name}`);

for (const fixture of [...positive, ...adversarial]) {
  errors.push(...runFixture(fixture));
}

errors.push(
  ...assertNoSecrets([
    ...schemaPairs.map((pair) => pair.schema),
    ...schemaPairs.map((pair) => pair.template),
    ...positive,
    ...adversarial,
  ]),
);

if (errors.length > 0) {
  console.error("Tribunal contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${schemaPairs.length} schemas/templates and ${positive.length + adversarial.length} fixtures.`,
);
