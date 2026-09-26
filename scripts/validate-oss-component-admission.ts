import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import {
  type OssComponentAdmissionFixture,
  validateOssComponentAdmission,
} from "../src/lib/quirk/governance/oss-component-admission";

const root = process.cwd();
const fixtureRoot = resolve(root, "fixtures/oss-components");
const positiveRoot = resolve(fixtureRoot, "positive");
const adversarialRoot = resolve(fixtureRoot, "adversarial");

async function listYamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return listYamlFiles(path);
      if (/\.ya?ml$/i.test(entry.name)) return [path];
      return [];
    }),
  );
  return nested.flat().sort();
}

async function validateFile(
  path: string,
  adversarial: boolean,
): Promise<string[]> {
  let fixture: OssComponentAdmissionFixture;
  try {
    fixture = parse(
      await readFile(path, "utf8"),
    ) as OssComponentAdmissionFixture;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [`${path}: invalid YAML (${reason})`];
  }

  const result = validateOssComponentAdmission(fixture);
  const failures: string[] = [];
  if (!adversarial && !result.valid) {
    failures.push(`${path}: expected pass, got ${result.errors.join(", ")}`);
  }

  if (adversarial) {
    if (result.valid) {
      failures.push(`${path}: expected fail closed, but passed`);
    }
    const expected = fixture.expected_failures ?? [];
    for (const code of expected) {
      if (!result.errors.includes(code)) {
        failures.push(`${path}: expected failure code '${code}' not present`);
      }
    }
  }

  return failures;
}

async function main() {
  const [positiveFiles, adversarialFiles] = await Promise.all([
    listYamlFiles(positiveRoot),
    listYamlFiles(adversarialRoot),
  ]);

  const failures = [
    ...(
      await Promise.all(positiveFiles.map((path) => validateFile(path, false)))
    ).flat(),
    ...(
      await Promise.all(
        adversarialFiles.map((path) => validateFile(path, true)),
      )
    ).flat(),
  ];

  if (failures.length > 0) {
    console.error("OSS component admission validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Validated ${positiveFiles.length} positive and ${adversarialFiles.length} adversarial OSS admission fixtures.`,
  );
}

await main();
