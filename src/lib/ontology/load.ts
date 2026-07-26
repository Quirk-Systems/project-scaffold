import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parse } from "yaml";
import type { CanonicalEntity, LocatedEntity, OntologyRegistry } from "./types";
import { ONTOLOGY_SCHEMA_VERSION } from "./types";
import { assertValidRegistry } from "./validate";

async function canonicalFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry): Promise<string[]> => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) return canonicalFiles(path);
        return /\.(?:json|ya?ml)$/.test(entry.name) ? [path] : [];
      }),
  );
  return nested.flat();
}

function parseCanonicalFile(contents: string, path: string): CanonicalEntity[] {
  let value: unknown;
  try {
    value = path.endsWith(".json") ? JSON.parse(contents) : parse(contents);
  } catch {
    throw new Error(`${path} contains invalid canonical YAML or JSON.`);
  }
  if (Array.isArray(value)) return value as CanonicalEntity[];
  if (
    value &&
    typeof value === "object" &&
    "entities" in value &&
    Array.isArray((value as { entities: unknown }).entities)
  ) {
    return (value as { entities: CanonicalEntity[] }).entities;
  }
  return [value as CanonicalEntity];
}

export async function loadRegistry(
  ontologyRoot = resolve(process.cwd(), "ontology"),
): Promise<OntologyRegistry> {
  const sourceRoots = ["canon", "seeds"].map((directory) =>
    resolve(ontologyRoot, directory),
  );
  const files = (await Promise.all(sourceRoots.map(canonicalFiles)))
    .flat()
    .sort();
  const entities: LocatedEntity[] = [];

  for (const file of files) {
    const parsed = parseCanonicalFile(await readFile(file, "utf8"), file);
    entities.push(
      ...parsed.map((entity) => ({
        entity,
        canonicalPath: relative(ontologyRoot, file).replaceAll("\\", "/"),
      })),
    );
  }

  const registry = { schema_version: ONTOLOGY_SCHEMA_VERSION, entities };
  assertValidRegistry(registry);
  return registry;
}
