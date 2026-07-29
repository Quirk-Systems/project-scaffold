#!/usr/bin/env bun
/**
 * Validates governance artifacts:
 * - every template/*.yaml matches its schema
 * - every schema/*.schema.json is valid JSON Schema (draft-07)
 * - every primitive doc references the matching schema
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import { parse } from "yaml";

const repoRoot = resolve(import.meta.dirname, "..");
const schemasDir = resolve(repoRoot, "schemas");
const templatesDir = resolve(repoRoot, "templates");
const primitivesDir = resolve(repoRoot, "docs/control-primitives");

const ajv = new Ajv({
  strict: false,
  formats: {
    uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    email: /^\S+@\S+\.\S+$/,
    "date-time":
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  },
});

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

async function loadSchemas(): Promise<Map<string, object>> {
  const files = await readdir(schemasDir);
  const map = new Map<string, object>();
  for (const file of files) {
    if (!file.endsWith(".schema.json")) continue;
    const raw = await readFile(resolve(schemasDir, file), "utf8");
    let schema: object;
    try {
      schema = JSON.parse(raw);
    } catch {
      die(`Invalid JSON in schema: ${file}`);
    }
    map.set(file, schema);
  }
  return map;
}

const templateToSchema: Record<string, string> = {
  "containment-contract.example.yaml": "quirk-containment-contract.schema.json",
  "spawn-gate.example.yaml": "quirk-agent-spawn-gate.schema.json",
  "model-substitution-test.example.yaml":
    "quirk-model-substitution-test.schema.json",
  "apprenticeship-continuity-test.example.yaml":
    "quirk-apprenticeship-continuity-test.schema.json",
  "reversibility-ledger.example.yaml": "quirk-reversibility-ledger.schema.json",
};

function schemaFileForTemplate(file: string): string {
  const schema = templateToSchema[file];
  if (!schema) {
    die(`No schema mapping configured for template: ${file}`);
  }
  return schema;
}

async function validateTemplates(schemas: Map<string, object>): Promise<void> {
  const files = await readdir(templatesDir);
  const templates = files.filter((f) => f.endsWith(".yaml"));
  if (templates.length === 0) die("No templates found.");

  for (const file of templates) {
    const expectedSchema = schemaFileForTemplate(file);
    const schema = schemas.get(expectedSchema);
    if (!schema) {
      die(
        `No matching schema for template ${file} (expected ${expectedSchema})`,
      );
    }

    const raw = await readFile(resolve(templatesDir, file), "utf8");
    let data: unknown;
    try {
      data = parse(raw);
    } catch {
      die(`Invalid YAML in template: ${file}`);
    }

    const validate = ajv.compile(schema);
    const ok = validate(data);
    if (!ok) {
      const messages = validate.errors
        ?.map((e) => `${e.instancePath} ${e.message}`)
        .join("; ");
      die(`Template ${file} failed validation: ${messages}`);
    }
    console.log(`✓ ${file}`);
  }
}

async function validateSchemasAreValidJsonSchema(
  schemas: Map<string, object>,
): Promise<void> {
  for (const [file, schema] of schemas) {
    try {
      ajv.compile(schema);
    } catch (err) {
      die(`Schema ${file} is not a valid JSON Schema: ${err}`);
    }
    console.log(`✓ schema ${file}`);
  }
}

async function validatePrimitiveDocsReferenceSchemas(
  schemas: Map<string, object>,
): Promise<void> {
  const files = await readdir(primitivesDir);
  const docs = files.filter((f) => f.endsWith(".md"));
  for (const file of docs) {
    const raw = await readFile(resolve(primitivesDir, file), "utf8");
    const expectedSchemaFile = file
      .replace(".md", ".schema.json")
      .replace(/^/, "quirk-");
    if (!schemas.has(expectedSchemaFile)) {
      die(
        `Primitive doc ${file} does not have a matching schema ${expectedSchemaFile}`,
      );
    }
    const schemaLink = `/schemas/${expectedSchemaFile}`;
    if (!raw.includes(schemaLink)) {
      die(`Primitive doc ${file} does not reference its schema ${schemaLink}`);
    }
    console.log(`✓ doc ${file}`);
  }
}

async function main(): Promise<void> {
  const schemas = await loadSchemas();
  await validateSchemasAreValidJsonSchema(schemas);
  await validateTemplates(schemas);
  await validatePrimitiveDocsReferenceSchemas(schemas);
  console.log("Governance contracts validated.");
}

main().catch((err) => die(String(err)));
